import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react'

import { confirmDestructive } from '@/lib/alerts'
import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'
import { powersync } from '@/lib/powersync/database'

import { useSessionRuntime } from '../session-runtime'
import { disconnectAndSignOut } from '../sign-out'

import { derivePhase, initialInternalState, reduce } from './reducer'
import { defaultIdentityStorage, type IdentityStorage } from './storage'
import type { AuthSession } from './types'

const RETRY_DELAY_MS = 5_000

const AuthSessionContext = createContext<AuthSession | null>(null)

interface AuthSessionProviderProps {
  storage?: IdentityStorage
  children: React.ReactNode
}

function confirmDestructiveSignOut(pendingCount: number): Promise<boolean> {
  return new Promise(resolve => {
    confirmDestructive(
      t('signOut.unsyncedChanges'),
      t('signOut.unsyncedDesc', { count: pendingCount }),
      {
        confirmLabel: t('signOut.signOutAnyway'),
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      }
    )
  })
}

export function AuthSessionProvider({
  storage = defaultIdentityStorage,
  children
}: AuthSessionProviderProps) {
  const runtime = useSessionRuntime()
  const { data: session, isPending } = runtime.useSession()

  const [state, dispatch] = useReducer(reduce, initialInternalState)

  const revalidationInFlightRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mount-time identity read. Reducer actions are serialized and
  // IDENTITY_LOADED is a no-op once identityBootstrapped is true, so a
  // late-resolving SecureStore read cannot clobber an earlier REVALIDATED
  // or CLEARED dispatch.
  useEffect(() => {
    let cancelled = false
    storage
      .read()
      .then(result => {
        if (cancelled) return
        dispatch({ type: 'IDENTITY_LOADED', identity: result })
      })
      .catch(() => {
        if (cancelled) return
        dispatch({ type: 'IDENTITY_LOADED', identity: null })
      })
    return () => {
      cancelled = true
    }
  }, [storage])

  // Mirror Better Auth's session snapshot into the reducer so derivePhase
  // sees the same state that drove the revalidation effect.
  useEffect(() => {
    dispatch({ type: 'SESSION_SNAPSHOT', session, isPending })
  }, [session, isPending])

  const revalidateRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    async function revalidate() {
      if (revalidationInFlightRef.current || isPending) return
      revalidationInFlightRef.current = true
      try {
        if (session?.user?.id) {
          const next = await storage.write(session.user.id)
          dispatch({ type: 'REVALIDATED_VALID', identity: next })
          return
        }

        if (!(await runtime.isOnline())) {
          dispatch({ type: 'REVALIDATED_NOOP' })
          return
        }

        const result = await runtime.getSession()

        if (result.data?.user?.id) {
          const next = await storage.write(result.data.user.id)
          dispatch({ type: 'REVALIDATED_VALID', identity: next })
        } else if (!result.error) {
          dispatch({ type: 'REVALIDATED_EXPIRED' })
        } else {
          // Network/server failure — leave status alone and retry once.
          dispatch({ type: 'REVALIDATED_NOOP' })
          scheduleRetry()
        }
      } finally {
        revalidationInFlightRef.current = false
      }
    }

    function scheduleRetry() {
      if (retryTimerRef.current) return
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        void revalidateRef.current()
      }, RETRY_DELAY_MS)
    }

    revalidateRef.current = revalidate
    void revalidate()
  }, [session, isPending, runtime, storage])

  useEffect(() => {
    const unsubscribeForeground = runtime.onForeground(() => {
      void revalidateRef.current()
    })
    const unsubscribeConnectivity = runtime.onConnectivityChange(online => {
      if (online) void revalidateRef.current()
    })
    return () => {
      unsubscribeForeground()
      unsubscribeConnectivity()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [runtime])

  const api = useMemo<AuthSession>(
    () => ({
      phase: derivePhase(state),
      identity: state.identity,
      session: state.session,
      status: state.status,
      markExpired: () => dispatch({ type: 'MARK_EXPIRED' }),
      signOut: async () => {
        const [{ count }] = await powersync.getAll<{ count: number }>(
          'SELECT COUNT(*) as count FROM ps_crud'
        )
        if (count > 0) {
          const confirmed = await confirmDestructiveSignOut(count)
          if (!confirmed) return
        } else {
          notifyWarning()
        }
        await disconnectAndSignOut()
        await storage.clear()
        dispatch({ type: 'CLEARED' })
      },
      emergencySignOut: async () => {
        try {
          await disconnectAndSignOut()
          await storage.clear()
        } finally {
          dispatch({ type: 'CLEARED' })
        }
      }
    }),
    [state, storage]
  )

  return (
    <AuthSessionContext.Provider value={api}>
      {children}
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession(): AuthSession {
  const ctx = useContext(AuthSessionContext)
  if (!ctx)
    throw new Error('useAuthSession must be used inside AuthSessionProvider')
  return ctx
}
