import { useRouter } from 'expo-router'
import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { KeyboardAwareScrollView } from '@/components/uniwind'
import { authClient } from '@/lib/auth/auth-client'

export default function EmailAuthScreen() {
  const router = useRouter()
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

    if (isSignUp && !name.trim()) {
      setError('Please enter your name.')
      setIsSubmitting(false)
      return
    }

    if (!email.trim()) {
      setError('Please enter your email.')
      setIsSubmitting(false)
      return
    }

    if (!password) {
      setError('Please enter your password.')
      setIsSubmitting(false)
      return
    }

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters.')
      setIsSubmitting(false)
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
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
      setError(result.error.message ?? 'Something went wrong.')
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
          {isSignUp ? 'Create account' : 'Sign in with email'}
        </Text>

        <View className="gap-4">
          {isSignUp && (
            <TextField>
              <Label>Name</Label>
              <Input
                placeholder="Your name"
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
            <Label>Email</Label>
            <Input
              ref={emailRef}
              placeholder="you@example.com"
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
            <Label>Password</Label>
            <Input
              ref={passwordRef}
              placeholder={
                isSignUp ? 'Create a password' : 'Enter your password'
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
            {isSignUp && <Description>At least 8 characters</Description>}
          </TextField>

          {isSignUp && (
            <TextField>
              <Label>Confirm Password</Label>
              <Input
                ref={confirmPasswordRef}
                placeholder="Confirm your password"
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

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Button
          variant="primary"
          isDisabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting
            ? isSignUp
              ? 'Creating account...'
              : 'Signing in...'
            : isSignUp
              ? 'Create account'
              : 'Sign in'}
        </Button>

        <Pressable onPress={toggleMode}>
          <Text className="text-muted text-center text-sm">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="text-foreground font-semibold">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  )
}
