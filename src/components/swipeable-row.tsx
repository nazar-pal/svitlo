import { useRef } from 'react'
import { Platform, Pressable, Text } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import { SymbolView } from 'expo-symbols'
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { impactMedium } from '@/lib/haptics'

const ACTION_WIDTH = 75
const FULL_SWIPE_THRESHOLD = ACTION_WIDTH + 25

interface SwipeableRowProps {
  children: React.ReactNode
  onDelete?: () => void
  openRowRef?: React.MutableRefObject<SwipeableMethods | null>
}

function DeleteAction({
  onDelete,
  translation,
  fullSwipeTriggered
}: {
  onDelete: () => void
  translation: SharedValue<number>
  fullSwipeTriggered: SharedValue<boolean>
}) {
  useAnimatedReaction(
    () => Math.abs(translation.value),
    (current, prev) => {
      if (
        current >= FULL_SWIPE_THRESHOLD &&
        (prev ?? 0) < FULL_SWIPE_THRESHOLD
      ) {
        fullSwipeTriggered.value = true
        runOnJS(impactMedium)()
      } else if (
        current < FULL_SWIPE_THRESHOLD &&
        (prev ?? 0) >= FULL_SWIPE_THRESHOLD
      ) {
        fullSwipeTriggered.value = false
      }
    }
  )

  const style = useAnimatedStyle(() => ({
    width: Math.max(ACTION_WIDTH, Math.abs(translation.value))
  }))

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onDelete}
        className="bg-danger flex-1 items-center justify-center gap-0.5"
      >
        <SymbolView name="trash.fill" size={20} tintColor="#FFFFFF" />
        <Text
          allowFontScaling={false}
          className="text-[13px] font-medium text-white"
        >
          Delete
        </Text>
      </Pressable>
    </Animated.View>
  )
}

export function SwipeableRow({
  children,
  onDelete,
  openRowRef
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null)
  const fullSwipeTriggered = useSharedValue(false)

  if (!onDelete || Platform.OS === 'web') return <>{children}</>

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1}
      overshootFriction={3}
      rightThreshold={40}
      renderRightActions={(_progress, translation) => (
        <DeleteAction
          onDelete={onDelete}
          translation={translation}
          fullSwipeTriggered={fullSwipeTriggered}
        />
      )}
      onSwipeableWillOpen={() => {
        if (fullSwipeTriggered.value) {
          fullSwipeTriggered.value = false
          swipeableRef.current?.close()
          onDelete()
          return
        }
        impactMedium()
        if (openRowRef?.current && openRowRef.current !== swipeableRef.current)
          openRowRef.current.close()
        if (openRowRef) openRowRef.current = swipeableRef.current
      }}
      onSwipeableClose={() => {
        if (openRowRef?.current === swipeableRef.current)
          openRowRef.current = null
      }}
    >
      {children}
    </ReanimatedSwipeable>
  )
}
