import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { DynamicColorIOS } from 'react-native'
import { useCSSVariable } from 'uniwind'

export default function AppTabs() {
  const [accentColor, blackColor, whiteColor, accentSoftColor] = useCSSVariable(
    ['--color-accent', '--color-black', '--color-white', '--color-accent-soft']
  ) as [string, string, string, string]

  return (
    <NativeTabs
      backgroundColor={undefined}
      badgeBackgroundColor={accentColor}
      labelStyle={{
        color: isLiquidGlassAvailable()
          ? DynamicColorIOS({
              light: blackColor,
              dark: whiteColor
            })
          : accentSoftColor
      }}
      iconColor={
        isLiquidGlassAvailable()
          ? DynamicColorIOS({
              light: blackColor,
              dark: whiteColor
            })
          : accentSoftColor
      }
      tintColor={accentColor}
      labelVisibilityMode="labeled"
      indicatorColor={accentColor + '25'}
      disableTransparentOnScrollEdge={true} // Used to prevent transparent background on iOS 18 and older
    >
      <NativeTabs.Trigger name="index">
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

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
          Settings
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
