import type { ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import {
  Host,
  Button as SwiftButton,
  Rectangle as SwiftRectangle
} from '@expo/ui/swift-ui'
import {
  accessibilityHint as accessibilityHintModifier,
  accessibilityLabel as accessibilityLabelModifier,
  buttonStyle,
  disabled as disabledModifier,
  opacity
} from '@expo/ui/swift-ui/modifiers'

// Workaround for iOS 26 menu-dismiss tap-through.
// https://github.com/expo/expo/issues/44144 — remove when Expo ships a fix.
// SwiftUI Button absorbs the dismissal tap so it doesn't leak to the JS
// Pressable underneath. Only mounted on iOS 26+, where the regression exists —
// earlier iOS and Android use a plain Pressable and pay zero native-host cost.

const NEEDS_OVERLAY =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26

const INVISIBLE = [opacity(0.001)]
const HOST_STYLE = [
  StyleSheet.absoluteFill,
  { pointerEvents: 'box-none' as const }
]

interface Props {
  onPress?: () => void
  disabled?: boolean
  className?: string
  accessibilityLabel?: string
  accessibilityHint?: string
  children: ReactNode
}

export function NativeTapOverlay({
  onPress,
  disabled,
  className,
  accessibilityLabel,
  accessibilityHint,
  children
}: Props) {
  if (!NEEDS_OVERLAY || !onPress)
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        className={className}
      >
        {children}
      </Pressable>
    )

  const modifiers = [
    buttonStyle('plain'),
    ...(disabled ? [disabledModifier(true)] : []),
    ...(accessibilityLabel
      ? [accessibilityLabelModifier(accessibilityLabel)]
      : []),
    ...(accessibilityHint ? [accessibilityHintModifier(accessibilityHint)] : [])
  ]

  return (
    <View className={className}>
      {children}
      <Host style={HOST_STYLE} matchContents={false}>
        <SwiftButton onPress={onPress} modifiers={modifiers}>
          <SwiftRectangle modifiers={INVISIBLE} />
        </SwiftButton>
      </Host>
    </View>
  )
}
