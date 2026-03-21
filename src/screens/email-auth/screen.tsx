import { useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { signInSchema, signUpSchema } from '@/data/client/validation'
import { authClient } from '@/lib/auth/auth-client'
import { useTranslation } from '@/lib/i18n'

export default function EmailAuthScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)

  const isSignUp = mode === 'sign-up'

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')

    const schema = isSignUp ? signUpSchema : signInSchema
    const input = isSignUp
      ? { name, email, password, confirmPassword }
      : { email, password }
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setIsSubmitting(false)
      return
    }

    const result = isSignUp
      ? await authClient.signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      : await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password
        })

    if (result.error) {
      setError(result.error.message ?? t('auth.somethingWentWrong'))
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    router.back()
  }

  function toggleMode() {
    setMode(isSignUp ? 'sign-in' : 'sign-up')
    setPassword('')
    setConfirmPassword('')
    setError('')
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
            <TextField>
              <Label>{t('auth.name')}</Label>
              <Input
                placeholder={t('auth.namePlaceholder')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </TextField>
          )}

          <TextField>
            <Label>{t('auth.email')}</Label>
            <Input
              ref={emailRef}
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
              placeholder={
                isSignUp ? t('auth.createPassword') : t('auth.enterPassword')
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType={isSignUp ? 'next' : 'done'}
              onSubmitEditing={() =>
                isSignUp ? confirmPasswordRef.current?.focus() : handleSubmit()
              }
            />
            {isSignUp && <Description>{t('auth.passwordHint')}</Description>}
          </TextField>

          {isSignUp && (
            <TextField>
              <Label>{t('auth.confirmPassword')}</Label>
              <Input
                ref={confirmPasswordRef}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </TextField>
          )}
        </View>

        <FormError message={error} />

        <Button
          variant="primary"
          isDisabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting
            ? isSignUp
              ? t('auth.creatingAccount')
              : t('auth.signingIn')
            : isSignUp
              ? t('auth.createAccount')
              : t('auth.signIn')}
        </Button>

        <Pressable onPress={toggleMode}>
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
