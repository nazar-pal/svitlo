import { useRef, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { SymbolView } from 'expo-symbols'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated'

import { impactLight, impactMedium, notifySuccess } from '@/lib/haptics'
import { scheduleOnRN } from 'react-native-worklets'

const ACTION_WIDTH = 78
const FULL_SWIPE_RATIO = 0.6
const BUTTON_SIZE = 54
const BUTTON_RADIUS = 14

const SNAP_SPRING = { damping: 20, stiffness: 200, mass: 0.8 }
const CLOSE_SPRING = {
  damping: 22,
  stiffness: 250,
  mass: 0.7,
  overshootClamping: true
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface SwipeableRowRef {
  close: () => void
}

interface SwipeableRowProps {
  children: React.ReactNode
  onDelete?: () => void
  openRowRef?: React.MutableRefObject<SwipeableRowRef | null>
}

export function SwipeableRow({
  children,
  onDelete,
  openRowRef
}: SwipeableRowProps) {
  const translateX = useSharedValue(0)
  const rowWidth = useSharedValue(0)
  const rowHeight = useSharedValue(0)
  const contextX = useSharedValue(0)
  const hasTriggeredRevealHaptic = useSharedValue(false)
  const hasTriggeredFullSwipeHaptic = useSharedValue(false)
  const [isOpen, setIsOpen] = useState(false)
  const selfRef = useRef<SwipeableRowRef>({ close: () => {} })

  const fireRevealHaptic = () => impactMedium()
  const fireFullSwipeHaptic = () => notifySuccess()
  const fireDeletePressHaptic = () => impactLight()

  const close = () => {
    translateX.value = withSpring(0, CLOSE_SPRING)
    setIsOpen(false)

    if (openRowRef?.current === selfRef.current) openRowRef.current = null
  }

  selfRef.current.close = close

  const performDelete = () => {
    translateX.value = withSpring(-rowWidth.value, CLOSE_SPRING, finished => {
      if (finished) {
        if (onDelete) scheduleOnRN(onDelete)
        translateX.value = withSpring(0, CLOSE_SPRING)
      }
    })
    setIsOpen(false)
    if (openRowRef?.current === selfRef.current) openRowRef.current = null
  }

  const closeOtherOpenRow = () => {
    if (openRowRef?.current && openRowRef.current !== selfRef.current)
      openRowRef.current.close()
  }

  const registerOpen = () => {
    closeOtherOpenRow()
    setIsOpen(true)
    if (openRowRef) openRowRef.current = selfRef.current
  }

  const tapToClose = Gesture.Tap()
    .enabled(isOpen)
    .onEnd(() => {
      scheduleOnRN(close)
    })

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      contextX.value = translateX.value
      hasTriggeredRevealHaptic.value = false
      hasTriggeredFullSwipeHaptic.value = false
      scheduleOnRN(closeOtherOpenRow)
    })
    .onUpdate(event => {
      const next = contextX.value + event.translationX
      translateX.value = Math.min(0, next)

      const absX = Math.abs(translateX.value)
      const fullSwipeThreshold = rowWidth.value * FULL_SWIPE_RATIO

      if (absX >= ACTION_WIDTH && !hasTriggeredRevealHaptic.value) {
        hasTriggeredRevealHaptic.value = true
        scheduleOnRN(fireRevealHaptic)
      }

      if (absX >= fullSwipeThreshold && !hasTriggeredFullSwipeHaptic.value) {
        hasTriggeredFullSwipeHaptic.value = true
        scheduleOnRN(fireFullSwipeHaptic)
      } else if (
        absX < fullSwipeThreshold &&
        hasTriggeredFullSwipeHaptic.value
      ) {
        hasTriggeredFullSwipeHaptic.value = false
      }
    })
    .onEnd(event => {
      const absX = Math.abs(translateX.value)
      const fullSwipeThreshold = rowWidth.value * FULL_SWIPE_RATIO

      const fastFlick = Math.abs(event.velocityX) > 1500 && absX > ACTION_WIDTH
      if (absX >= fullSwipeThreshold || fastFlick) {
        translateX.value = withSpring(
          -rowWidth.value,
          { ...CLOSE_SPRING, velocity: event.velocityX },
          finished => {
            if (finished) scheduleOnRN(performDelete)
          }
        )
        return
      }

      if (absX >= ACTION_WIDTH / 2) {
        translateX.value = withSpring(-ACTION_WIDTH, {
          ...SNAP_SPRING,
          velocity: event.velocityX
        })

        scheduleOnRN(registerOpen)
      } else {
        translateX.value = withSpring(0, {
          ...CLOSE_SPRING,
          velocity: event.velocityX
        })

        if (contextX.value < 0) scheduleOnRN(close)
      }
    })

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }))

  const actionStyle = useAnimatedStyle(() => ({
    width: Math.abs(translateX.value)
  }))

  const buttonStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value)
    const fullSwipeThreshold = rowWidth.value * FULL_SWIPE_RATIO

    const progress = interpolate(
      absX,
      [ACTION_WIDTH, fullSwipeThreshold],
      [0, 1],
      'clamp'
    )

    return {
      width: interpolate(progress, [0, 1], [BUTTON_SIZE, absX]),
      height: interpolate(progress, [0, 1], [BUTTON_SIZE, rowHeight.value]),
      borderRadius: interpolate(progress, [0, 1], [BUTTON_RADIUS, 0])
    }
  })

  if (!onDelete || Platform.OS === 'web') return <>{children}</>

  return (
    <View
      className="overflow-hidden"
      onLayout={event => {
        rowWidth.value = event.nativeEvent.layout.width
        rowHeight.value = event.nativeEvent.layout.height
      }}
    >
      <Animated.View
        className="absolute top-0 right-0 bottom-0 items-center justify-center"
        style={actionStyle}
      >
        <AnimatedPressable
          onPress={() => {
            fireDeletePressHaptic()
            performDelete()
          }}
          accessibilityLabel="Delete"
          accessibilityRole="button"
          className="bg-danger items-center justify-center"
          style={buttonStyle}
        >
          <SymbolView name="trash.fill" size={22} tintColor="#FFFFFF" />
        </AnimatedPressable>
      </Animated.View>
      <GestureDetector gesture={Gesture.Simultaneous(pan, tapToClose)}>
        <Animated.View
          className="bg-background"
          style={contentStyle}
          pointerEvents={isOpen ? 'box-only' : 'auto'}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}
