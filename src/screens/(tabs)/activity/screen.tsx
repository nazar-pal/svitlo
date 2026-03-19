import {
  Host,
  Picker,
  Button as SwiftButton,
  Divider as SwiftDivider,
  Menu as SwiftMenu,
  Text as SwiftText
} from '@expo/ui/swift-ui'
import { labelStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { useScrollToTop } from '@react-navigation/native'
import { format, parseISO } from 'date-fns'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Chip, ListGroup, Separator, useThemeColor } from 'heroui-native'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  FadeIn,
  LinearTransition,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import { EmptyState } from '@/components/empty-state'
import { type Filter, FILTERS, FILTER_LABELS } from '@/lib/activity'
import { selection } from '@/lib/haptics'
import { type ActivityItem, useActivityData } from './lib/use-activity-data'

const ItemSeparator = () => <Separator className="mx-4" />

export default function ActivityScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [generatorScope, setGeneratorScope] = useState<string | null>(null)
  const [mutedColor, successColor, backgroundColor] = useThemeColor([
    'muted',
    'success',
    'background'
  ])
  const isLiquidGlass = isLiquidGlassAvailable()

  const { userOrgs, admin, items, availableGenerators, effectiveScope } =
    useActivityData(filter, generatorScope)

  const scrollRef = useRef<FlatList<ActivityItem>>(null)
  useScrollToTop(
    scrollRef as React.RefObject<{
      scrollToOffset(options: { offset: number; animated?: boolean }): void
    }>
  )
  const insets = useSafeAreaInsets()
  const headerScrollOffset = insets.top + (isLiquidGlass ? 51 : 44)
  const animatedTranslateY = useSharedValue(0)
  const isScrolledDown = useRef(false)

  const setIsScrolledDown = (value: boolean) => {
    isScrolledDown.current = value
  }

  const scrollHandler = useAnimatedScrollHandler(event => {
    animatedTranslateY.value = interpolate(
      event.contentOffset.y,
      [-headerScrollOffset, 0],
      [0, headerScrollOffset],
      Extrapolation.CLAMP
    )
    scheduleOnRN(setIsScrolledDown, event.contentOffset.y > 10)
  })

  const stickyHeaderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: animatedTranslateY.value }],
      backgroundColor: 'transparent'
    }
  })

  const renderItem = ({ item }: { item: ActivityItem }) => {
    if (item.type === 'session')
      return (
        <SessionItem
          item={item}
          mutedColor={mutedColor}
          successColor={successColor}
        />
      )
    return <MaintenanceItem item={item} mutedColor={mutedColor} />
  }

  const handleFilterChange = (i: number) => {
    selection()
    setFilter(FILTERS[i]!)
    if (isScrolledDown.current)
      scrollRef.current?.scrollToOffset({
        offset: -30 - insets.top,
        animated: true
      })
  }

  const pickerContent = (
    <Host matchContents style={{ height: 31 }}>
      <Picker
        selection={FILTERS.indexOf(filter)}
        onSelectionChange={handleFilterChange}
        modifiers={[pickerStyle('segmented')]}
      >
        {FILTERS.map((f, i) => (
          <SwiftText key={f} modifiers={[tag(i)]}>
            {FILTER_LABELS[f]}
          </SwiftText>
        ))}
      </Picker>
    </Host>
  )

  const listHeader = (
    <View
      style={{ marginBottom: -headerScrollOffset }}
      pointerEvents="box-none"
    >
      <Animated.View style={stickyHeaderStyle}>
        <View className="pb-6">
          {isLiquidGlass ? (
            <GlassView
              style={{
                borderRadius: 80,
                height: 32,
                marginHorizontal: 16,
                marginTop: 16,
                width: 'auto'
              }}
            >
              {pickerContent}
            </GlassView>
          ) : (
            <BlurView
              tint="systemMaterial"
              intensity={100}
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                borderRadius: 10,
                overflow: 'hidden'
              }}
            >
              {pickerContent}
            </BlurView>
          )}
        </View>
      </Animated.View>
      <View style={{ height: headerScrollOffset }} pointerEvents="none" />
    </View>
  )

  if (userOrgs.length === 0)
    return (
      <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="building.2"
          title="No Organizations"
          description="Create an organization or accept an invitation to get started."
          actionLabel="Go to Members"
          onAction={() => router.push('/members')}
        />
      </View>
    )

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerRight: () =>
            availableGenerators.length > 1 ? (
              <Host matchContents>
                <SwiftMenu
                  label="Filter"
                  systemImage="line.3.horizontal.decrease"
                  modifiers={[labelStyle('iconOnly')]}
                >
                  {admin ? (
                    <SwiftButton
                      label="Organization"
                      systemImage={
                        effectiveScope === 'org' ? 'checkmark' : undefined
                      }
                      onPress={() => setGeneratorScope('org')}
                    />
                  ) : null}
                  <SwiftButton
                    label="My Generators"
                    systemImage={
                      effectiveScope === 'my' ? 'checkmark' : undefined
                    }
                    onPress={() => setGeneratorScope('my')}
                  />
                  <SwiftDivider />
                  <SwiftMenu label="Generator">
                    {availableGenerators.map(g => (
                      <SwiftButton
                        key={g.id}
                        label={g.title}
                        systemImage={
                          effectiveScope === g.id ? 'checkmark' : undefined
                        }
                        onPress={() => setGeneratorScope(g.id)}
                      />
                    ))}
                  </SwiftMenu>
                </SwiftMenu>
              </Host>
            ) : null
        }}
      />
      <Animated.FlatList
        ref={scrollRef}
        style={{ backgroundColor }}
        contentInsetAdjustmentBehavior="automatic"
        scrollToOverflowEnabled
        onScroll={scrollHandler}
        data={items}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item: ActivityItem) => item.id}
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={
          <EmptyState
            icon="clock.arrow.circlepath"
            title="No Activity"
            description="Activity from generator runs and maintenance will appear here."
          />
        }
        renderItem={renderItem}
      />
    </>
  )
}

function SessionItem({
  item,
  mutedColor,
  successColor
}: {
  item: Extract<ActivityItem, { type: 'session' }>
  mutedColor: string
  successColor: string
}) {
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <ListGroup.Item>
        <ListGroup.ItemPrefix>
          <SymbolView
            name="bolt.fill"
            size={16}
            tintColor={item.isInProgress ? successColor : mutedColor}
          />
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>
            {format(parseISO(item.timestamp), 'MMM d, HH:mm')}
          </ListGroup.ItemTitle>
          <ListGroup.ItemDescription>
            {item.generatorTitle} · {item.userName} · {item.duration}
          </ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <Chip
          size="sm"
          variant="soft"
          color={item.isInProgress ? 'success' : undefined}
        >
          {item.isInProgress ? 'Active' : 'Session'}
        </Chip>
      </ListGroup.Item>
    </Animated.View>
  )
}

function MaintenanceItem({
  item,
  mutedColor
}: {
  item: Extract<ActivityItem, { type: 'maintenance' }>
  mutedColor: string
}) {
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <ListGroup.Item>
        <ListGroup.ItemPrefix>
          <SymbolView name="wrench.fill" size={16} tintColor={mutedColor} />
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>
            {format(parseISO(item.timestamp), 'MMM d, HH:mm')}
          </ListGroup.ItemTitle>
          <ListGroup.ItemDescription>
            {item.generatorTitle} · {item.userName} · {item.templateName}
            {item.record.notes ? ` · ${item.record.notes}` : ''}
          </ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <Chip size="sm" variant="soft">
          Maintenance
        </Chip>
      </ListGroup.Item>
    </Animated.View>
  )
}
