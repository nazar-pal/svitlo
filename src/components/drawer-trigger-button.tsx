import { DrawerActions } from '@react-navigation/native'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { useNavigation } from 'expo-router'
import { Pressable, View } from 'react-native'

export function DrawerTriggerButton() {
  const navigation = useNavigation()

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={8}
    >
      <View pointerEvents="none">
        <Host matchContents>
          <SwiftButton
            label="Menu"
            systemImage="line.3.horizontal"
            modifiers={[labelStyle('iconOnly')]}
          />
        </Host>
      </View>
    </Pressable>
  )
}
