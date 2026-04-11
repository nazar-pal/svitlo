import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { LocalIdentity, getLocalIdentity } from './offline-identity'

interface LocalIdentityContextValue {
  identity: LocalIdentity | null
  isLoading: boolean
  // Apply an identity that has already been persisted to / cleared from SecureStore.
  // Call this after any persistLocalIdentity() or clearLocalIdentity() call.
  applyIdentity: (identity: LocalIdentity | null) => void
}

const LocalIdentityContext = createContext<LocalIdentityContextValue | null>(
  null
)

export function LocalIdentityProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [identity, setIdentity] = useState<LocalIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // If the mount read of SecureStore races with a revalidation that already
  // called applyIdentity(), the stale read must not clobber the fresh value.
  const hasAppliedRef = useRef(false)

  useEffect(() => {
    getLocalIdentity()
      .then(result => {
        if (!hasAppliedRef.current) setIdentity(result)
      })
      .catch(() => {
        // SecureStore failed — treat as no stored identity so the user can sign in.
        if (!hasAppliedRef.current) setIdentity(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const applyIdentity = useCallback((next: LocalIdentity | null) => {
    hasAppliedRef.current = true
    setIdentity(next)
  }, [])

  return (
    <LocalIdentityContext.Provider
      value={{ identity, isLoading, applyIdentity }}
    >
      {children}
    </LocalIdentityContext.Provider>
  )
}

export function useLocalIdentity(): LocalIdentityContextValue {
  const ctx = useContext(LocalIdentityContext)
  if (!ctx) {
    throw new Error(
      'useLocalIdentity must be used inside LocalIdentityProvider'
    )
  }
  return ctx
}
