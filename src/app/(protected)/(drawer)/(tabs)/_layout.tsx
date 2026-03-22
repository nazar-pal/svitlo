import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useThemeColor } from 'heroui-native'
import { DynamicColorIOS, processColor } from 'react-native'

import { InvitationWatcher } from '@/components/invitation-watcher'
import { useTranslation } from '@/lib/i18n'

export const unstable_settings = {
  initialRouteName: '(home)'
}

export default function AppTabs() {
  const [accentColor] = useThemeColor(['accent'])
  const { t } = useTranslation()

  const processed = processColor(accentColor)
  const indicatorColor =
    typeof processed === 'number'
      ? `rgba(${(processed >> 16) & 0xff}, ${(processed >> 8) & 0xff}, ${processed & 0xff}, 0.15)`
      : accentColor

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
        indicatorColor={indicatorColor}
        disableTransparentOnScrollEdge={true} // Used to prevent transparent background on iOS 18 and older
      >
        <NativeTabs.Trigger name="(home)" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            {t('tabs.home')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="maintenance-tab">
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            {t('tabs.maintenance')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver.fill" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="activity">
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            {t('tabs.activity')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger
          name="members"
          role={isLiquidGlassAvailable() ? 'search' : undefined}
        >
          <NativeTabs.Trigger.Label selectedStyle={{ color: accentColor }}>
            {t('tabs.members')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.2.fill" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  )
}
