import { SymbolView } from 'expo-symbols'
import { Surface } from 'heroui-native'
import { Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

export function AllClearCard() {
  const successColor = useCSSVariable('--color-success') as string | undefined

  return (
    <Surface variant="secondary" className="items-center gap-3 py-8">
      <SymbolView
        name="checkmark.circle.fill"
        size={44}
        tintColor={successColor}
      />
      <View className="items-center gap-1">
        <Text className="text-foreground text-[17px] font-semibold">
          All Clear
        </Text>
        <Text className="text-muted text-center text-[14px]">
          No attention needed right now
        </Text>
      </View>
    </Surface>
  )
}
