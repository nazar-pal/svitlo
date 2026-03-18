import { SymbolView } from 'expo-symbols'
import { PressableFeedback, Surface, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

import type { Generator } from '@/data/client/db-schema'
import { formatRestRemaining } from '@/lib/utils/time'

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
  const [mutedColor, accentColor] = useThemeColor(['muted', 'accent'])

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
        <View className="flex-row items-center gap-3">
          <View className="bg-accent/15 size-10 items-center justify-center rounded-xl">
            <SymbolView name="zzz" size={20} tintColor={accentColor} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              className="text-foreground text-4.25 font-semibold"
              numberOfLines={1}
            >
              {generator.title}
            </Text>
            <Text className="text-muted text-3.25">
              Resting — ready in {formatRestRemaining(restEndsAt)}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
        </View>
      </Surface>
    </PressableFeedback>
  )
}
