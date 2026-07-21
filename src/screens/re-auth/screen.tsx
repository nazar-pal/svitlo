import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { useRef, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'

import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form/form-field'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { fail, ok } from '@/data/shared/result'
import { signInSchema } from '@/data/shared/validation'
import { authClient } from '@/lib/auth/auth-client'
import { useAuthSession } from '@/lib/auth/session'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'
import { type BuildResult, useForm, validateWithZod } from '@/lib/hooks/forms'
import { useTranslation } from '@/lib/i18n'

type SignInInput = {
  email: string
  password: string
}

export default function ReAuthScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { identity } = useAuthSession()

  const [showEmailForm, setShowEmailForm] = useState(false)
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

  const { submit, formError, isSubmitting, bind } = useForm<
    SignInInput,
    SignInInput
  >({
    initial: { email: '', password: '' },
    build: (values): BuildResult<SignInInput> => {
      const parsed = validateWithZod(signInSchema, values)
      if (!parsed.ok) return parsed
      return {
        ok: true,
        data: {
          email: parsed.data.email.trim().toLowerCase(),
          password: parsed.data.password
        }
      }
    },
    mutate: async input => {
      const res = await authClient.signIn.email(input)
      if (res.error)
        return fail('AUTH_FAILED', {
          message: res.error.message ?? t('auth.somethingWentWrong')
        })
      // Signing into a different account than the local data belongs to is
      // not a success — the mismatch must fail here, before `useForm` fires
      // the success haptic and `onSuccess` navigates away.
      if (await handleAccountMismatch(res.data?.user?.id))
        return fail('AUTH_FAILED', { message: t('auth.differentAccountDesc') })
      return ok
    },
    onSuccess: () => router.back()
  })

  const emailBinding = bind.text('email')
  const passwordBinding = bind.text('password')

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
            <FormField
              binding={emailBinding}
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <FormField
              binding={passwordBinding}
              label={t('auth.password')}
              ref={passwordRef}
              placeholder={t('auth.enterPassword')}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <FormError message={formError} />

            <Button
              variant="primary"
              isDisabled={isSubmitting}
              onPress={submit}
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
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
