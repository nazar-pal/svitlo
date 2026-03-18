import * as AppleAuthentication from 'expo-apple-authentication'
import { Spinner } from 'heroui-native'
import React from 'react'
import { View } from 'react-native'

import { FormError } from '@/components/form-error'

interface AppleSignInButtonProps {
  isSigningIn: boolean
  error: string
  onPress: () => void
}

export function AppleSignInButton({
  isSigningIn,
  error,
  onPress
}: AppleSignInButtonProps) {
  return (
    <View className="gap-3">
      <View>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={{ height: 52, width: '100%' }}
          onPress={onPress}
        />
        {isSigningIn && (
          <View className="rounded-3.5 absolute inset-0 items-center justify-center bg-black/60">
            <Spinner color="white" />
          </View>
        )}
      </View>

      <FormError message={error} />
    </View>
  )
}
