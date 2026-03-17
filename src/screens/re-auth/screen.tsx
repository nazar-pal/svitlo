import { useRouter } from 'expo-router'
import {
  Alert as HeroAlert,
  Button,
  Input,
  Label,
  TextField
} from 'heroui-native'
import React, { useRef, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'

import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { authClient } from '@/lib/auth/auth-client'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { useAppleSignIn } from '@/lib/auth/use-apple-sign-in'

export default function ReAuthScreen() {
  const router = useRouter()
  const { identity } = useLocalIdentity()

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const passwordRef = useRef<TextInput>(null)

  async function handleAccountMismatch(newUserId: string | undefined) {
    if (newUserId && identity?.userId && newUserId !== identity.userId) {
      Alert.alert(
        'Different account detected',
        'You signed in with a different account than the one stored on this device. To switch accounts, please sign out first. Your current sign-in has been cancelled.',
        [{ text: 'OK' }]
      )
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

    if (!email.trim()) {
      setEmailError('Please enter your email.')
      setIsEmailSubmitting(false)
      return
    }

    if (!password) {
      setEmailError('Please enter your password.')
      setIsEmailSubmitting(false)
      return
    }

    const result = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password
    })

    if (result.error) {
      setEmailError(result.error.message ?? 'Something went wrong.')
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

        {showEmailForm ? (
          <View className="gap-4">
            <TextField>
              <Label>Email</Label>
              <Input
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
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleEmailSignIn}
              />
            </TextField>

            {emailError ? (
              <HeroAlert status="danger">
                <HeroAlert.Indicator />
                <HeroAlert.Content>
                  <HeroAlert.Description>{emailError}</HeroAlert.Description>
                </HeroAlert.Content>
              </HeroAlert>
            ) : null}

            <Button
              variant="primary"
              isDisabled={isEmailSubmitting}
              onPress={handleEmailSignIn}
            >
              {isEmailSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </View>
        ) : (
          <Pressable onPress={() => setShowEmailForm(true)}>
            <Text className="text-muted text-center text-xs">
              Signed in with email?
            </Text>
          </Pressable>
        )}

        <Button variant="ghost" onPress={() => router.back()}>
          Not now
        </Button>
      </View>
    </KeyboardAwareScrollView>
  )
}
