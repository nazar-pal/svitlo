import { useRouter } from 'expo-router'
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { signInSchema, signUpSchema } from '@/data/shared/validation'
import { fail, ok } from '@/data/shared/result'
import { authClient } from '@/lib/auth/auth-client'
import { type BuildResult, useForm, validateWithZod } from '@/lib/hooks/forms'
import { useTranslation } from '@/lib/i18n'

type AuthValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

type AuthInput =
  | { kind: 'sign-in'; email: string; password: string }
  | { kind: 'sign-up'; name: string; email: string; password: string }

export default function EmailAuthScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)

  const isSignUp = mode === 'sign-up'

  const { form, submit, formError, clearFormError, isSubmitting, bind } =
    useForm<AuthValues, AuthInput>({
      initial: { name: '', email: '', password: '', confirmPassword: '' },
      build: (values): BuildResult<AuthInput> => {
        if (isSignUp) {
          const parsed = validateWithZod(signUpSchema, values)
          if (!parsed.ok) return parsed
          return {
            ok: true,
            data: {
              kind: 'sign-up',
              name: parsed.data.name.trim(),
              email: parsed.data.email.trim().toLowerCase(),
              password: parsed.data.password
            }
          }
        }
        const parsed = validateWithZod(signInSchema, {
          email: values.email,
          password: values.password
        })
        if (!parsed.ok) return parsed
        return {
          ok: true,
          data: {
            kind: 'sign-in',
            email: parsed.data.email.trim().toLowerCase(),
            password: parsed.data.password
          }
        }
      },
      mutate: async input => {
        const res =
          input.kind === 'sign-up'
            ? await authClient.signUp.email({
                name: input.name,
                email: input.email,
                password: input.password
              })
            : await authClient.signIn.email({
                email: input.email,
                password: input.password
              })
        if (res.error)
          return fail('AUTH_FAILED', {
            message: res.error.message ?? t('auth.somethingWentWrong')
          })
        return ok
      },
      onSuccess: () => router.back()
    })

  const nameBinding = bind.text('name')
  const emailBinding = bind.text('email')
  const passwordBinding = bind.text('password')
  const confirmPasswordBinding = bind.text('confirmPassword')

  function toggleMode() {
    form.patch({ password: '', confirmPassword: '' })
    clearFormError()
    setMode(isSignUp ? 'sign-in' : 'sign-up')
  }

  return (
    <KeyboardAwareScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-6 py-10"
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      <View className="mx-auto w-full max-w-110 flex-1 justify-center gap-8">
        <Text className="text-foreground text-3xl font-bold">
          {isSignUp ? t('auth.createAccount') : t('auth.signInWithEmail')}
        </Text>

        <View className="gap-4">
          {isSignUp && (
            <TextField isInvalid={nameBinding.isInvalid}>
              <Label>{t('auth.name')}</Label>
              <Input
                testID="email-auth-name-input"
                placeholder={t('auth.namePlaceholder')}
                value={nameBinding.value}
                onChangeText={nameBinding.onChangeText}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <FieldError>{nameBinding.errorMessage}</FieldError>
            </TextField>
          )}

          <TextField isInvalid={emailBinding.isInvalid}>
            <Label>{t('auth.email')}</Label>
            <Input
              testID="email-auth-email-input"
              ref={emailRef}
              placeholder={t('auth.emailPlaceholder')}
              value={emailBinding.value}
              onChangeText={emailBinding.onChangeText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <FieldError>{emailBinding.errorMessage}</FieldError>
          </TextField>

          <TextField isInvalid={passwordBinding.isInvalid}>
            <Label>{t('auth.password')}</Label>
            <Input
              testID="email-auth-password-input"
              ref={passwordRef}
              placeholder={
                isSignUp ? t('auth.createPassword') : t('auth.enterPassword')
              }
              value={passwordBinding.value}
              onChangeText={passwordBinding.onChangeText}
              secureTextEntry
              autoCapitalize="none"
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType={isSignUp ? 'next' : 'done'}
              onSubmitEditing={() =>
                isSignUp ? confirmPasswordRef.current?.focus() : submit()
              }
            />
            {isSignUp && <Description>{t('auth.passwordHint')}</Description>}
            <FieldError>{passwordBinding.errorMessage}</FieldError>
          </TextField>

          {isSignUp && (
            <TextField isInvalid={confirmPasswordBinding.isInvalid}>
              <Label>{t('auth.confirmPassword')}</Label>
              <Input
                testID="email-auth-confirm-password-input"
                ref={confirmPasswordRef}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPasswordBinding.value}
                onChangeText={confirmPasswordBinding.onChangeText}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <FieldError>{confirmPasswordBinding.errorMessage}</FieldError>
            </TextField>
          )}
        </View>

        <FormError message={formError} />

        <Button
          testID="email-auth-submit-button"
          variant="primary"
          isDisabled={isSubmitting}
          onPress={submit}
        >
          {isSubmitting
            ? isSignUp
              ? t('auth.creatingAccount')
              : t('auth.signingIn')
            : isSignUp
              ? t('auth.createAccount')
              : t('auth.signIn')}
        </Button>

        <Pressable testID="email-auth-toggle-mode" onPress={toggleMode}>
          <Text className="text-muted text-center text-sm">
            {isSignUp
              ? t('auth.alreadyHaveAccount')
              : t('auth.dontHaveAccount')}
            <Text className="text-foreground font-semibold">
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  )
}
