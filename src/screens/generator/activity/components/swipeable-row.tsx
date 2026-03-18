import { useRef } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable'

interface SwipeableRowProps {
  children: React.ReactNode
  onDelete?: () => void
  openRowRef?: React.MutableRefObject<SwipeableMethods | null>
}

function RightAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      className="bg-danger w-18.75 items-center justify-center"
    >
      <View className="items-center gap-1">
        <Text className="text-danger-foreground text-xs font-medium">
          Delete
        </Text>
      </View>
    </Pressable>
  )
}

export function SwipeableRow({
  children,
  onDelete,
  openRowRef
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null)

  if (!onDelete || Platform.OS === 'web') return <>{children}</>

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => <RightAction onDelete={onDelete} />}
      onSwipeableWillOpen={() => {
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
