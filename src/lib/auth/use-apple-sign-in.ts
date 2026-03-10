import { useState } from 'react'

import { appleNativeSignIn } from './apple-native-sign-in'

type SignInData = Awaited<ReturnType<typeof appleNativeSignIn>>

interface UseAppleSignInOptions {
  onSuccess?: (data: SignInData) => void | Promise<void>
}

export function useAppleSignIn(options?: UseAppleSignInOptions) {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    if (isSigningIn) return

    try {
      setIsSigningIn(true)
      setError('')

      const data = await appleNativeSignIn()
      await options?.onSuccess?.(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to start the sign-in flow.'
      )
    } finally {
      setIsSigningIn(false)
    }
  }

  return { isSigningIn, error, signIn }
}
