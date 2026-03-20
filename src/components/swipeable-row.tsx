import { useContext, useRef, useState } from 'react'
import { Platform, Pressable, Text } from 'react-native'
import { DrawerGestureContext } from 'react-native-drawer-layout'
import ReanimatedSwipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import { SymbolView } from 'expo-symbols'
import Animated, {
  type SharedValue,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { impactMedium } from '@/lib/haptics'

const ACTION_WIDTH = 75
const FULL_SWIPE_OVERSHOOT = 25

interface SwipeableRowProps {
  children: React.ReactNode
  onEdit?: () => void
  onDelete?: () => void
  side?: 'left' | 'right'
  openRowRef?: React.MutableRefObject<SwipeableMethods | null>
}

function Actions({
  onEdit,
  onDelete,
  translation,
  fullSwipeTriggered
}: {
  onEdit?: () => void
  onDelete?: () => void
  translation: SharedValue<number>
  fullSwipeTriggered: SharedValue<boolean>
}) {
  const hasDelete = !!onDelete
  const hasEdit = !!onEdit
  const actionCount = (hasEdit ? 1 : 0) + (hasDelete ? 1 : 0)
  const totalActionWidth = actionCount * ACTION_WIDTH
  const fullSwipeThreshold = totalActionWidth + FULL_SWIPE_OVERSHOOT

  useAnimatedReaction(
    () => Math.abs(translation.value),
    (current, prev) => {
      if (!hasDelete) return
      if (current >= fullSwipeThreshold && (prev ?? 0) < fullSwipeThreshold) {
        fullSwipeTriggered.value = true
        runOnJS(impactMedium)()
      } else if (
        current < fullSwipeThreshold &&
        (prev ?? 0) >= fullSwipeThreshold
      ) {
        fullSwipeTriggered.value = false
      }
    }
  )

  const deleteStyle = useAnimatedStyle(() => {
    const absTranslation = Math.abs(translation.value)
    const editWidth = hasEdit ? ACTION_WIDTH : 0
    return { width: Math.max(ACTION_WIDTH, absTranslation - editWidth) }
  })

  const editStyle = useAnimatedStyle(() => {
    if (!hasDelete) return { width: ACTION_WIDTH }
    const absTranslation = Math.abs(translation.value)
    const progress = interpolate(
      absTranslation,
      [totalActionWidth, fullSwipeThreshold],
      [1, 0],
      Extrapolation.CLAMP
    )
    return {
      width: progress * ACTION_WIDTH,
      opacity: progress
    }
  })

  // Delete first = outermost in both row (left) and row-reverse (right) layouts
  return (
    <>
      {hasDelete ? (
        <Animated.View style={deleteStyle}>
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
      ) : null}
      {hasEdit ? (
        <Animated.View style={editStyle}>
          <Pressable
            onPress={onEdit}
            className="bg-accent flex-1 items-center justify-center gap-0.5"
          >
            <SymbolView
              name="square.and.pencil"
              size={20}
              tintColor="#FFFFFF"
            />
            <Text
              allowFontScaling={false}
              className="text-[13px] font-medium text-white"
            >
              Edit
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  )
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  side = 'right',
  openRowRef
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null)
  const drawerGesture = useContext(DrawerGestureContext)
  const [isRowOpen, setIsRowOpen] = useState(false)
  const fullSwipeTriggered = useSharedValue(false)

  if ((!onDelete && !onEdit) || Platform.OS === 'web') return <>{children}</>

  const actions = (
    _progress: SharedValue<number>,
    translation: SharedValue<number>
  ) => (
    <Actions
      onEdit={onEdit}
      onDelete={onDelete}
      translation={translation}
      fullSwipeTriggered={fullSwipeTriggered}
    />
  )

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1}
      overshootFriction={3}
      {...(side === 'left'
        ? {
            leftThreshold: 40,
            renderLeftActions: actions,
            dragOffsetFromRightEdge: isRowOpen ? 10 : Number.MAX_SAFE_INTEGER
          }
        : {
            rightThreshold: 40,
            renderRightActions: actions,
            dragOffsetFromLeftEdge: isRowOpen ? 10 : Number.MAX_SAFE_INTEGER
          })}
      {...(drawerGesture
        ? isRowOpen
          ? { blocksExternalGesture: drawerGesture }
          : { simultaneousWithExternalGesture: drawerGesture }
        : undefined)}
      onSwipeableWillOpen={() => {
        if (fullSwipeTriggered.value && onDelete) {
          fullSwipeTriggered.value = false
          swipeableRef.current?.close()
          onDelete()
          return
        }
        setIsRowOpen(true)
        impactMedium()
        if (openRowRef?.current && openRowRef.current !== swipeableRef.current)
          openRowRef.current.close()
        if (openRowRef) openRowRef.current = swipeableRef.current
      }}
      onSwipeableClose={() => {
        setIsRowOpen(false)
        if (openRowRef?.current === swipeableRef.current)
          openRowRef.current = null
      }}
    >
      {children}
    </ReanimatedSwipeable>
  )
}
