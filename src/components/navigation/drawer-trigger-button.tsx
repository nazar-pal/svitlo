import { DrawerActions } from '@react-navigation/native'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { useNavigation } from 'expo-router'
import { Pressable, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'

import { useTranslation } from '@/lib/i18n'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'

export function DrawerTriggerButton() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const pendingInvitations = usePendingInvitations()

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={8}
      accessibilityLabel={
        pendingInvitations.length > 0
          ? t('drawer.menuWithInvitations', {
              count: pendingInvitations.length
            })
          : t('common.menu')
      }
    >
      <View pointerEvents="none">
        <Host matchContents>
          <SwiftButton
            label={t('common.menu')}
            systemImage="line.3.horizontal"
            modifiers={[labelStyle('iconOnly')]}
          />
        </Host>
      </View>
      {pendingInvitations.length > 0 && (
        <Animated.View
          entering={ZoomIn.duration(200)}
          className="bg-danger absolute -top-1 -right-1 size-2 rounded-full"
        />
      )}
    </Pressable>
  )
}
