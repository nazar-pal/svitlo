import { useRouter } from 'expo-router'
import { Button, Input, Label, TextField } from 'heroui-native'
import React, { useRef, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'

import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { FormError } from '@/components/form-error'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { signInSchema } from '@/data/client/validation'
import { authClient } from '@/lib/auth/auth-client'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'
import { useTranslation } from '@/lib/i18n'

export default function ReAuthScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { identity } = useLocalIdentity()

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const passwordRef = useRef<TextInput>(null)

  async function handleAccountMismatch(newUserId: string | undefined) {
    if (newUserId && identity?.userId && newUserId !== identity.userId) {
      Alert.alert(t('auth.differentAccount'), t('auth.differentAccountDesc'), [
        { text: t('common.ok') }
      ])
      await authClient.signOut()
      return true
    }
    return false
  }

  const { isSigningIn, error, signIn } = useAppleSignIn({
    async onSuccess(data) {
      const newUserId = data && 'user' in data ? data.user?.id : undefined
      if (await handleAccountMismatch(newUserId)) return
      router.back()
    }
  })

  async function handleEmailSignIn() {
    if (isEmailSubmitting) return
    setIsEmailSubmitting(true)
    setEmailError('')

    const parsed = signInSchema.safeParse({ email, password })
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0].message)
      setIsEmailSubmitting(false)
      return
    }

    const result = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password
    })

    if (result.error) {
      setEmailError(result.error.message ?? t('auth.somethingWentWrong'))
      setIsEmailSubmitting(false)
      return
    }

    const newUserId = result.data?.user?.id
    if (await handleAccountMismatch(newUserId)) {
      setIsEmailSubmitting(false)
      return
    }

    setIsEmailSubmitting(false)
    router.back()
  }

  return (
    <KeyboardAwareScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="min-h-full px-6 py-10"
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      <View className="mx-auto w-full max-w-110 flex-1 justify-center gap-6">
        <View className="gap-3">
          <Text className="text-foreground text-center text-3xl font-semibold">
            {t('auth.sessionExpired')}
          </Text>
          <Text className="text-muted text-center text-base leading-6">
            {t('auth.sessionExpiredDesc')}
          </Text>
        </View>

        <AppleSignInButton
          isSigningIn={isSigningIn}
          error={error}
          onPress={signIn}
        />

        {showEmailForm ? (
          <View className="gap-4">
            <TextField>
              <Label>{t('auth.email')}</Label>
              <Input
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </TextField>

            <TextField>
              <Label>{t('auth.password')}</Label>
              <Input
                ref={passwordRef}
                placeholder={t('auth.enterPassword')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleEmailSignIn}
              />
            </TextField>

            <FormError message={emailError} />

            <Button
              variant="primary"
              isDisabled={isEmailSubmitting}
              onPress={handleEmailSignIn}
            >
              {isEmailSubmitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </View>
        ) : (
          <Pressable onPress={() => setShowEmailForm(true)}>
            <Text className="text-muted text-center text-xs">
              {t('auth.signedInWithEmail')}
            </Text>
          </Pressable>
        )}

        <Button variant="ghost" onPress={() => router.back()}>
          {t('auth.notNow')}
        </Button>
      </View>
    </KeyboardAwareScrollView>
  )
}
