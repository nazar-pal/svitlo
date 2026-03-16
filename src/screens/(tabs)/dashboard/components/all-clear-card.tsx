import { SymbolView } from 'expo-symbols'
import { Text, View } from 'react-native'

export function AllClearCard() {
  return (
    <View className="bg-surface-secondary items-center gap-3 rounded-2xl px-4 py-8">
      <SymbolView name="checkmark.circle.fill" size={44} tintColor="#22c55e" />
      <View className="items-center gap-1">
        <Text className="text-foreground text-[17px] font-semibold">
          All Clear
        </Text>
        <Text className="text-muted text-center text-[14px]">
          No attention needed right now
        </Text>
      </View>
    </View>
  )
}
