import { PlatformColor, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from 'react-native-reanimated'

import { circularDistance } from '@/lib/utils/circular-distance'

interface AnimatedHeaderTitleProps {
  titles: string[]
  count: number
  scrollX: SharedValue<number>
  pageWidth: number
}

function Title({
  title,
  index,
  count,
  scrollX,
  pageWidth,
  isFirst
}: {
  title: string
  index: number
  count: number
  scrollX: SharedValue<number>
  pageWidth: number
  isFirst: boolean
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const dist = circularDistance(scrollX.value, index, count, pageWidth)
    const input = [-pageWidth, 0, pageWidth]
    return {
      opacity: interpolate(dist, input, [0, 1, 0], 'clamp')
    }
  })

  return (
    <Animated.Text
      style={[
        { fontSize: 17, fontWeight: '600', color: PlatformColor('label') },
        !isFirst && { position: 'absolute' },
        animatedStyle
      ]}
      numberOfLines={1}
    >
      {title}
    </Animated.Text>
  )
}

export function AnimatedHeaderTitle({
  titles,
  count,
  scrollX,
  pageWidth
}: AnimatedHeaderTitleProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {titles.map((title, index) => (
        <Title
          key={index}
          title={title}
          index={index}
          count={count}
          scrollX={scrollX}
          pageWidth={pageWidth}
          isFirst={index === 0}
        />
      ))}
    </View>
  )
}
