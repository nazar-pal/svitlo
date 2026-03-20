import { useContext, useRef, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { DrawerGestureContext } from 'react-native-drawer-layout'
import ReanimatedSwipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable'

import { impactMedium } from '@/lib/haptics'

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
  side = 'right'
}: {
  onEdit?: () => void
  onDelete?: () => void
  side?: 'left' | 'right'
}) {
  const editButton = onEdit ? (
    <Pressable
      onPress={onEdit}
      className="bg-accent w-18.75 items-center justify-center"
    >
      <Text className="text-accent-foreground text-xs font-medium">Edit</Text>
    </Pressable>
  ) : null

  const deleteButton = onDelete ? (
    <Pressable
      onPress={onDelete}
      className="bg-danger w-18.75 items-center justify-center"
    >
      <Text className="text-danger-foreground text-xs font-medium">Delete</Text>
    </Pressable>
  ) : null

  return (
    <View className="flex-row">
      {side === 'left' ? (
        <>
          {deleteButton}
          {editButton}
        </>
      ) : (
        <>
          {editButton}
          {deleteButton}
        </>
      )}
    </View>
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

  if ((!onDelete && !onEdit) || Platform.OS === 'web') return <>{children}</>

  const actions = () => (
    <Actions onEdit={onEdit} onDelete={onDelete} side={side} />
  )

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      // When closed, disable the opposite-direction drag offset so swipes
      // pass through to the drawer. When open, restore it so the user can
      // swipe the row shut before the drawer reacts.
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
      // Block the drawer gesture while the row is open so closing the row
      // doesn't simultaneously dismiss the drawer. When closed, run both
      // gestures simultaneously so the drawer can be swiped shut normally.
      {...(drawerGesture
        ? isRowOpen
          ? { blocksExternalGesture: drawerGesture }
          : { simultaneousWithExternalGesture: drawerGesture }
        : undefined)}
      onSwipeableWillOpen={() => {
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
