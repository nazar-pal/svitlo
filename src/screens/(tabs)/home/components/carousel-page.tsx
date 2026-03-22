import type { ReactNode } from 'react'
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from 'react-native-reanimated'

import { circularDistance } from '@/lib/utils/circular-distance'

interface CarouselPageProps {
  index: number
  count: number
  scrollX: SharedValue<number>
  pageWidth: number
  children: ReactNode
}

export function CarouselPage({
  index,
  count,
  scrollX,
  pageWidth,
  children
}: CarouselPageProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const dist = circularDistance(scrollX.value, index, count, pageWidth)
    const input = [-pageWidth, 0, pageWidth]
    return {
      transform: [{ scale: interpolate(dist, input, [0.95, 1, 0.95], 'clamp') }]
    }
  })

  return (
    <Animated.View
      style={[{ width: pageWidth, flex: 1 }, animatedStyle]}
      className="px-5 py-4"
    >
      {children}
    </Animated.View>
  )
}
