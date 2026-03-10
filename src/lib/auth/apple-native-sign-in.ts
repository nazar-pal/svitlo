import * as AppleAuthentication from 'expo-apple-authentication'

import { authClient } from './auth-client'

export async function appleNativeSignIn() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL
    ]
  })

  if (!credential.identityToken) {
    throw new Error('Apple Sign In failed: no identity token received.')
  }

  const { data, error } = await authClient.signIn.social({
    provider: 'apple',
    idToken: {
      token: credential.identityToken
    }
  })

  if (error) {
    throw new Error(error.message ?? 'Unable to sign in with Apple.')
  }

  if (credential.fullName) {
    const name = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ')

    if (name) {
      await authClient.updateUser({ name }).catch(() => {})
    }
  }

  return data
}
