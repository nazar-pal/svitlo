import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useThemeColor } from 'heroui-native'
import { DynamicColorIOS } from 'react-native'

import { InvitationWatcher } from '@/components/invitation-watcher'

export const unstable_settings = {
  initialRouteName: '(home)'
}

export default function AppTabs() {
  const [accentColor] = useThemeColor(['accent'])

  const dynamicLabelAndIconColor = isLiquidGlassAvailable()
    ? DynamicColorIOS({ light: '#000', dark: '#FFF' })
    : undefined

  return (
    <>
      <InvitationWatcher />
      <NativeTabs
        minimizeBehavior="onScrollDown"
        backgroundColor={undefined}
        badgeBackgroundColor={accentColor}
        labelStyle={{ color: dynamicLabelAndIconColor }}
        iconColor={dynamicLabelAndIconColor}
        tintColor={accentColor}
        labelVisibilityMode="labeled"
        indicatorColor={accentColor + '25'}
        disableTransparentOnScrollEdge={true} // Used to prevent transparent background on iOS 18 and older
      >
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            Home
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="maintenance-tab">
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            Maintenance
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver.fill" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="activity">
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            Activity
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" />
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
    </>
  )
}
