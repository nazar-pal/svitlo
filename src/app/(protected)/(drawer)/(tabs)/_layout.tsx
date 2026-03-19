import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useThemeColor } from 'heroui-native'
import React from 'react'
import { DynamicColorIOS } from 'react-native'

export const unstable_settings = {
  initialRouteName: '(dashboard)'
}

export default function AppTabs() {
  const [accentColor] = useThemeColor(['accent'])

  const dynamicLabelAndIconColor = isLiquidGlassAvailable()
    ? DynamicColorIOS({ light: '#000', dark: '#FFF' })
    : undefined

  return (
    <NativeTabs
      backgroundColor={undefined}
      badgeBackgroundColor={accentColor}
      labelStyle={{ color: dynamicLabelAndIconColor }}
      iconColor={dynamicLabelAndIconColor}
      tintColor={accentColor}
      labelVisibilityMode="labeled"
      indicatorColor={accentColor + '25'}
      disableTransparentOnScrollEdge={true} // Used to prevent transparent background on iOS 18 and older
    >
      <NativeTabs.Trigger name="(dashboard)">
        <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
          Dashboard
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="generators">
        <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
          Generators
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bolt.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="members"
        role={isLiquidGlassAvailable() ? 'search' : undefined}
      >
        <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
          Members
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
