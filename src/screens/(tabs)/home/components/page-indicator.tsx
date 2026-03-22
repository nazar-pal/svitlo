import { View } from 'react-native'
import { useThemeColor } from 'heroui-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from 'react-native-reanimated'

import { circularDistance } from '@/lib/utils/circular-distance'

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
  count,
  scrollX,
  pageWidth,
  status
}: {
  index: number
  count: number
  scrollX: SharedValue<number>
  pageWidth: number
  status: GeneratorStatus
}) {
  const statusColor = useThemeColor(GENERATOR_STATUS_META[status].color)

  const animatedStyle = useAnimatedStyle(() => {
    const dist = circularDistance(scrollX.value, index, count, pageWidth)
    const input = [-pageWidth, 0, pageWidth]
    return {
      width: interpolate(dist, input, [8, 10, 8], 'clamp'),
      height: interpolate(dist, input, [8, 10, 8], 'clamp'),
      opacity: interpolate(dist, input, [0.3, 1, 0.3], 'clamp'),
      transform: [
        {
          scale: interpolate(dist, input, [0.8, 1, 0.8], 'clamp')
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
          count={count}
          scrollX={scrollX}
          pageWidth={pageWidth}
          status={status}
        />
      ))}
    </View>
  )
}
