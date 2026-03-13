import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { Generator } from '@/data/client/db-schema'
import { formatRestRemaining } from '@/lib/time'

interface RestingGeneratorItemProps {
  generator: Generator
  restEndsAt: Date
  onPress: () => void
}

export function RestingGeneratorItem({
  generator,
  restEndsAt,
  onPress
}: RestingGeneratorItemProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-xl bg-blue-500/15">
          <SymbolView name="zzz" size={20} tintColor="#3b82f6" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text
            className="text-foreground text-[17px] font-semibold"
            numberOfLines={1}
          >
            {generator.name}
          </Text>
          <Text className="text-muted text-[13px]">
            Resting — ready in {formatRestRemaining(restEndsAt)}
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
      </View>
    </Pressable>
  )
}
