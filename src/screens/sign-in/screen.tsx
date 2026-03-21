import { Link, useRouter } from 'expo-router'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { AnimatedIcon } from '@/components/animated-icon'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { SafeAreaView } from '@/components/uniwind'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'
import { useTranslation } from '@/lib/i18n'

export default function SignInScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isSigningIn, error, signIn } = useAppleSignIn()

  return (
    <SafeAreaView className="bg-background flex-1 px-6">
      <View className="mx-auto w-full max-w-110 flex-1 justify-center gap-10">
        <View className="items-center gap-6">
          <AnimatedIcon />

          <View className="gap-3">
            <Text className="text-foreground text-center text-3xl font-bold">
              {t('auth.welcome')}
            </Text>
            <Text className="text-muted text-center text-base leading-6">
              {t('auth.welcomeDesc')}
            </Text>
          </View>
        </View>

        <AppleSignInButton
          isSigningIn={isSigningIn}
          error={error}
          onPress={signIn}
        />

        <View className="gap-3">
          <Text className="text-muted text-center text-sm leading-6">
            {t('auth.agreeToPolicy')}{' '}
            <Link
              href="/privacy-policy"
              className="text-foreground font-semibold"
            >
              {t('auth.privacyPolicy')}
            </Link>
            .
          </Text>

          <Pressable onPress={() => router.push('/(auth)/email-auth')}>
            <Text className="text-muted text-center text-xs">
              {t('auth.useEmailInstead')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}
