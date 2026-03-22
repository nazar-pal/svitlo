import { View } from 'react-native'
import { useThemeColor } from 'heroui-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from 'react-native-reanimated'

import {
  GENERATOR_STATUS_META,
  type GeneratorStatus
} from '@/lib/generator/status'

interface PageIndicatorProps {
  count: number
  scrollX: SharedValue<number>
  pageWidth: number
  statuses: GeneratorStatus[]
}

function Dot({
  index,
  scrollX,
  pageWidth,
  status
}: {
  index: number
  scrollX: SharedValue<number>
  pageWidth: number
  status: GeneratorStatus
}) {
  const statusColor = useThemeColor(GENERATOR_STATUS_META[status].color)

  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth
    ]
    return {
      width: interpolate(scrollX.value, input, [8, 10, 8], 'clamp'),
      height: interpolate(scrollX.value, input, [8, 10, 8], 'clamp'),
      opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], 'clamp'),
      transform: [
        {
          scale: interpolate(scrollX.value, input, [0.8, 1, 0.8], 'clamp')
        }
      ]
    }
  })

  return (
    <Animated.View
      style={[
        {
          borderRadius: 5,
          backgroundColor: statusColor
        },
        animatedStyle
      ]}
    />
  )
}

export function PageIndicator({
  count,
  scrollX,
  pageWidth,
  statuses
}: PageIndicatorProps) {
  if (count <= 1) return null

  return (
    <View className="flex-row items-center justify-center gap-2 py-3">
      {statuses.map((status, index) => (
        <Dot
          key={index}
          index={index}
          scrollX={scrollX}
          pageWidth={pageWidth}
          status={status}
        />
      ))}
    </View>
  )
}
