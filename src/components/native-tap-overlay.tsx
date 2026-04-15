import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Host,
  Button as SwiftButton,
  Rectangle as SwiftRectangle
} from '@expo/ui/swift-ui'
import {
  buttonStyle,
  disabled as disabledModifier,
  opacity
} from '@expo/ui/swift-ui/modifiers'

// Workaround for iOS 26 menu-dismiss tap-through.
// https://github.com/expo/expo/issues/44144 — remove when Expo ships a fix.
// SwiftUI Button absorbs the dismissal tap so it doesn't leak to the JS
// Pressable underneath.

const PLAIN_BUTTON = [buttonStyle('plain')]
const PLAIN_BUTTON_DISABLED = [buttonStyle('plain'), disabledModifier(true)]
const INVISIBLE = [opacity(0.001)]

const HOST_STYLE = [
  StyleSheet.absoluteFill,
  { pointerEvents: 'box-none' as const }
]

export function NativeTapOverlay({
  onPress,
  disabled,
  className,
  children
}: {
  onPress?: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <View className={className}>
      {children}
      {onPress ? (
        <Host style={HOST_STYLE} matchContents={false}>
          <SwiftButton
            onPress={onPress}
            modifiers={disabled ? PLAIN_BUTTON_DISABLED : PLAIN_BUTTON}
          >
            <SwiftRectangle modifiers={INVISIBLE} />
          </SwiftButton>
        </Host>
      ) : null}
    </View>
  )
}
