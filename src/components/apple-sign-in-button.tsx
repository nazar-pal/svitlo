import * as AppleAuthentication from 'expo-apple-authentication'
import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

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
          <View className="absolute inset-0 items-center justify-center rounded-[14px] bg-black/60">
            <ActivityIndicator color="white" />
          </View>
        )}
      </View>

      {error ? (
        <Text className="bg-danger/10 text-danger rounded-2xl px-4 py-3 text-sm leading-5">
          {error}
        </Text>
      ) : null}
    </View>
  )
}
