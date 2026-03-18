import { SymbolView } from 'expo-symbols'
import { Surface, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

export function AllClearCard() {
  const successColor = useThemeColor('success')

  return (
    <Surface variant="secondary" className="items-center gap-3 py-8">
      <SymbolView
        name="checkmark.circle.fill"
        size={44}
        tintColor={successColor}
      />
      <View className="items-center gap-1">
        <Text className="text-foreground text-4.25 font-semibold">
          All Clear
        </Text>
        <Text className="text-muted text-3.5 text-center">
          No attention needed right now
        </Text>
      </View>
    </Surface>
  )
}
