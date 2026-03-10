import { Link } from 'expo-router'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'

import { AnimatedIcon } from '@/components/animated-icon'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'

export default function SignInScreen() {
  const { isSigningIn, error, signIn } = useAppleSignIn()

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="min-h-full px-6 py-10"
    >
      <View className="mx-auto w-full max-w-[440px] flex-1 justify-center gap-10">
        <View className="items-center gap-6">
          <AnimatedIcon />

          <View className="gap-3">
            <Text className="text-foreground text-center text-3xl font-bold">
              Welcome to Svitlo
            </Text>
            <Text className="text-muted text-center text-base leading-6">
              Sign in with your Apple ID to get started.
            </Text>
          </View>
        </View>

        <AppleSignInButton
          isSigningIn={isSigningIn}
          error={error}
          onPress={signIn}
        />

        <Text className="text-muted text-center text-sm leading-6">
          By continuing, you agree to the{' '}
          <Link
            href="/privacy-policy"
            className="text-foreground font-semibold"
          >
            Privacy Policy
          </Link>
          .
        </Text>
      </View>
    </ScrollView>
  )
}
