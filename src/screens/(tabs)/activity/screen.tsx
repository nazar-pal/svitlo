import { Host, Picker, Text as SwiftText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { useScrollToTop } from '@react-navigation/native'
import { parseISO } from 'date-fns'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Chip, ListGroup, Separator, useThemeColor } from 'heroui-native'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import type { SwipeableRowRef } from '@/components/swipeable-row'
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
import { GeneratorScopeMenu } from '@/components/generator-scope-menu'
import { SwipeableRow } from '@/components/swipeable-row'
import { formatDate, useTranslation } from '@/lib/i18n'
import { confirmDeleteRecord, confirmDeleteSession } from '@/lib/alerts'
import { type Filter, FILTERS, filterLabel } from '@/lib/activity-filters'
import { selection } from '@/lib/haptics'
import { type ActivityItem, useActivityData } from './lib/use-activity-data'

const ItemSeparator = () => <Separator className="mx-4" />

export default function ActivityScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')
  const [mutedColor, successColor, warningColor, backgroundColor] =
    useThemeColor(['muted', 'success', 'warning', 'background'])
  const isLiquidGlass = isLiquidGlassAvailable()
  const openRowRef = useRef<SwipeableRowRef | null>(null)

  const {
    userOrgs,
    admin,
    userId,
    items,
    availableGenerators,
    effectiveScope,
    setGeneratorScope
  } = useActivityData(filter)

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

  const closeOpenRow = () => openRowRef.current?.close()

  const stickyHeaderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: animatedTranslateY.value }],
      backgroundColor: 'transparent'
    }
  })

  const renderItem = ({ item }: { item: ActivityItem }) => {
    if (item.type === 'session') {
      const canEdit = !item.isInProgress
      return (
        <SwipeableRow
          onDelete={
            canEdit ? () => confirmDeleteSession(userId, item.id) : undefined
          }
          openRowRef={openRowRef}
        >
          <SessionItem
            item={item}
            mutedColor={mutedColor}
            successColor={successColor}
            onPress={
              canEdit
                ? () => {
                    openRowRef.current?.close()
                    router.push(`/activity/edit-session?sessionId=${item.id}`)
                  }
                : undefined
            }
          />
        </SwipeableRow>
      )
    }

    return (
      <SwipeableRow
        onDelete={() => confirmDeleteRecord(userId, item.id)}
        openRowRef={openRowRef}
      >
        <MaintenanceItem
          item={item}
          warningColor={warningColor}
          onPress={() => {
            openRowRef.current?.close()
            router.push(`/activity/edit-maintenance?recordId=${item.id}`)
          }}
        />
      </SwipeableRow>
    )
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
            {filterLabel(f)}
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
          title={t('home.noOrganizations')}
          description={t('home.noOrganizationsDesc')}
          actionLabel={t('home.goToMembers')}
          onAction={() => router.push('/members')}
        />
      </View>
    )

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerRight:
            availableGenerators.length > 1
              ? () => (
                  <GeneratorScopeMenu
                    admin={admin}
                    availableGenerators={availableGenerators}
                    effectiveScope={effectiveScope}
                    onSelect={setGeneratorScope}
                  />
                )
              : undefined
        }}
      />
      <Animated.FlatList
        ref={scrollRef}
        style={{ backgroundColor }}
        contentInsetAdjustmentBehavior="automatic"
        scrollToOverflowEnabled
        onScroll={scrollHandler}
        onScrollBeginDrag={closeOpenRow}
        data={items}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item: ActivityItem) => item.id}
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={
          <EmptyState
            icon="clock.arrow.circlepath"
            title={t('activity.noActivity')}
            description={t('activity.noActivityDesc')}
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
  successColor,
  onPress
}: {
  item: Extract<ActivityItem, { type: 'session' }>
  mutedColor: string
  successColor: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <ListGroup.Item onPress={onPress}>
        <ListGroup.ItemPrefix>
          <SymbolView
            name="bolt.fill"
            size={16}
            tintColor={item.isInProgress ? successColor : mutedColor}
          />
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>{item.generatorTitle}</ListGroup.ItemTitle>
          <ListGroup.ItemDescription>
            {item.userName} ·{' '}
            {formatDate(parseISO(item.timestamp), t('formats.dateTimeShort'))} ·{' '}
            {item.duration}
          </ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <Chip
          size="sm"
          variant="soft"
          color={item.isInProgress ? 'success' : undefined}
        >
          {item.isInProgress ? t('activity.active') : t('activity.run')}
        </Chip>
      </ListGroup.Item>
    </Animated.View>
  )
}

function MaintenanceItem({
  item,
  warningColor,
  onPress
}: {
  item: Extract<ActivityItem, { type: 'maintenance' }>
  warningColor: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <ListGroup.Item onPress={onPress}>
        <ListGroup.ItemPrefix>
          <SymbolView name="wrench.fill" size={16} tintColor={warningColor} />
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>{item.generatorTitle}</ListGroup.ItemTitle>
          <ListGroup.ItemDescription>
            {item.userName} ·{' '}
            {formatDate(parseISO(item.timestamp), t('formats.dateTimeShort'))} ·{' '}
            {item.templateName}
            {item.record.notes ? ` · ${item.record.notes}` : ''}
          </ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <Chip size="sm" variant="soft" color="warning">
          {t('activity.maintenance')}
        </Chip>
      </ListGroup.Item>
    </Animated.View>
  )
}
