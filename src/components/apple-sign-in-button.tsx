import * as AppleAuthentication from 'expo-apple-authentication'
import { Alert as HeroAlert, Spinner } from 'heroui-native'
import React from 'react'
import { View } from 'react-native'

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
            <Spinner color="white" />
          </View>
        )}
      </View>

      {error ? (
        <HeroAlert status="danger">
          <HeroAlert.Indicator />
          <HeroAlert.Content>
            <HeroAlert.Description>{error}</HeroAlert.Description>
          </HeroAlert.Content>
        </HeroAlert>
      ) : null}
    </View>
  )
}
