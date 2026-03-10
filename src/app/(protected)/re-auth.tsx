import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import React from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { authClient } from '@/lib/auth/auth-client'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'

export default function ReAuthScreen() {
  const router = useRouter()
  const { identity } = useLocalIdentity()

  const { isSigningIn, error, signIn } = useAppleSignIn({
    async onSuccess(data) {
      // Account mismatch guard: if the user signed in with a different account,
      // warn them instead of silently switching.
      const newUserId = data && 'user' in data ? data.user?.id : undefined
      if (newUserId && identity?.userId && newUserId !== identity.userId) {
        Alert.alert(
          'Different account detected',
          'You signed in with a different account than the one stored on this device. To switch accounts, please sign out first. Your current sign-in has been cancelled.',
          [{ text: 'OK' }]
        )
        // Sign out the new session so it doesn't persist
        await authClient.signOut()
        return
      }

      // Success — the AuthGate revalidation cycle will pick up the new session,
      // set sessionStatus to 'valid', and the banner will disappear.
      router.back()
    }
  })

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="min-h-full px-6 py-10"
    >
      <View className="mx-auto w-full max-w-[440px] flex-1 justify-center gap-6">
        <View className="gap-3">
          <Text className="text-foreground text-center text-3xl font-semibold">
            Session expired
          </Text>
          <Text className="text-muted text-center text-base leading-6">
            Sign in again to resume syncing your data. Your local data is safe
            and will not be lost.
          </Text>
        </View>

        <AppleSignInButton
          isSigningIn={isSigningIn}
          error={error}
          onPress={signIn}
        />

        <Button variant="ghost" onPress={() => router.back()}>
          Not now
        </Button>
      </View>
    </ScrollView>
  )
}
