import { useEffect, useRef, useState } from 'react'
import { Alert, useWindowDimensions, View } from 'react-native'
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-screens/experimental'
import { scheduleOnRN } from 'react-native-worklets'

import { setUIReady } from '@/lib/app-ready'
import { storage } from '@/lib/storage'
import { EmptyState } from '@/components/empty-state'
import { deleteGenerator } from '@/data/client/mutations/generators'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/generator/status'
import { impactLight, notifyWarning } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
import { getUserName } from '@/lib/utils/get-user-name'
import {
  Host,
  Button as SwiftButton,
  Divider as SwiftDivider,
  Menu as SwiftMenu
} from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'

import { AnimatedHeaderTitle } from './components/animated-header-title'
import { HeroCard, type HeroCardItem } from './components/hero-card'
import { PageIndicator } from './components/page-indicator'
import { useHomeData } from './lib/use-home-data'

export default function HomeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { width: screenWidth } = useWindowDimensions()
  const { generator: generatorParam } = useLocalSearchParams<{
    generator?: string
  }>()
  const {
    userId,
    userOrgs,
    selectedOrgId,
    isOrgsLoading,
    admin,
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users,
    myActiveSession
  } = useHomeData()

  // Signal app readiness once data has settled so the splash overlay can fade out.
  // The splash stays visible until setUIReady() fires via one of three paths:
  //  1. generators loaded → data is ready to display
  //  2. org selected, generators genuinely empty (uses a short timer because
  //     PowerSync doesn't transition through isLoading when the query SQL
  //     changes — the stale deferred result persists for a few renders)
  //  3. orgs query done, user has no organizations
  const [dataReady, setDataReady] = useState(false)
  useEffect(() => {
    if (dataReady || !userId) return

    if (generators.length > 0) {
      setDataReady(true)
      setUIReady()
      return
    }

    if (!isOrgsLoading && userOrgs.length === 0) {
      setDataReady(true)
      setUIReady()
      return
    }

    if (!selectedOrgId) return

    // When selectedOrgId first appears the generators query switches from
    // a no-op to a real SQLite query, but the hook still returns the old
    // empty result for a few renders. The timer lets that query settle;
    // if generators arrive first, this effect re-runs and clears the timer.
    const timer = setTimeout(() => {
      setDataReady(true)
      setUIReady()
    }, 150)
    return () => clearTimeout(timer)
  }, [
    userId,
    generators.length,
    selectedOrgId,
    isOrgsLoading,
    userOrgs.length,
    dataReady
  ])

  const count = generators.length
  const looped = count > 1

  const targetId = generatorParam ?? storage.getString('last-home-generator')
  const initialPage = targetId
    ? Math.max(
        0,
        generators.findIndex(g => g.id === targetId)
      )
    : 0

  const flatListRef = useAnimatedRef<Animated.FlatList<HeroCardItem>>()
  const scrollX = useSharedValue(initialPage * screenWidth)
  const [currentIndex, setCurrentIndex] = useState(initialPage)
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  const [prevCount, setPrevCount] = useState(count)
  if (count !== prevCount) {
    setPrevCount(count)
    setCurrentIndex(initialPage)
    currentIndexRef.current = initialPage
  }

  const updateIndex = (realIndex: number) => {
    if (realIndex !== currentIndexRef.current) {
      currentIndexRef.current = realIndex
      setCurrentIndex(realIndex)
      impactLight()
      storage.set('last-home-generator', generators[realIndex]!.id)
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollX.value = looped
        ? e.contentOffset.x % (count * screenWidth)
        : e.contentOffset.x
    },
    onMomentumEnd: e => {
      const flatIndex = Math.round(e.contentOffset.x / screenWidth)
      const realIndex = looped ? flatIndex % count : flatIndex
      scheduleOnRN(updateIndex, realIndex)
      if (looped && (flatIndex < count || flatIndex >= count * 2))
        scrollTo(flatListRef, (realIndex + count) * screenWidth, 0, false)
    }
  })

  // Don't render content until data is settled — splash overlay covers this
  if (!dataReady) return null

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

  const carouselItems: HeroCardItem[] = generators.map(g => {
    const sessions = sessionsByGenerator.get(g.id) ?? []
    const assignments = assignmentsByGenerator.get(g.id) ?? []
    return {
      generator: g,
      statusInfo: computeGeneratorStatus(g, sessions),
      nextMaintenance: nextMaintenanceByGenerator.get(g.id) ?? null,
      isMyActiveSession: myActiveSession?.generatorId === g.id,
      lifetimeHours: computeLifetimeHours(sessions),
      assignedUserNames: admin
        ? assignments.map(a => getUserName(users, a.userId))
        : []
    }
  })

  const loopedItems = looped
    ? [...carouselItems, ...carouselItems, ...carouselItems]
    : carouselItems
  const loopOffset = looped ? count : 0

  const safeIndex = Math.max(
    0,
    Math.min(currentIndex, carouselItems.length - 1)
  )
  const statuses = carouselItems.map(item => item.statusInfo.status)

  return (
    <>
      <Stack.Screen
        options={{
          title: carouselItems[safeIndex]?.generator.title ?? t('tabs.home'),
          headerShown: true,
          headerLargeTitle: false,
          ...(count > 1 && {
            headerTitle: () => (
              <AnimatedHeaderTitle
                titles={carouselItems.map(item => item.generator.title)}
                count={count}
                scrollX={scrollX}
                pageWidth={screenWidth}
              />
            )
          }),
          headerRight: () =>
            admin ? (
              <Host matchContents>
                {carouselItems.length > 0 ? (
                  <SwiftMenu
                    label={t('common.actions')}
                    systemImage="ellipsis.circle"
                    modifiers={[labelStyle('iconOnly')]}
                  >
                    <SwiftButton
                      label={t('home.addGenerator')}
                      systemImage="plus"
                      onPress={() => router.push('/generator/create')}
                    />
                    <SwiftButton
                      label={t('generator.settings')}
                      systemImage="gearshape"
                      onPress={() =>
                        router.push(
                          `/generator/${carouselItems[safeIndex]!.generator.id}/settings`
                        )
                      }
                    />
                    <SwiftButton
                      label={t('tabs.maintenance')}
                      systemImage="wrench.and.screwdriver"
                      onPress={() =>
                        router.push(
                          `/generator/${carouselItems[safeIndex]!.generator.id}/maintenance`
                        )
                      }
                    />
                    <SwiftDivider />
                    <SwiftButton
                      label={t('generator.deleteGenerator')}
                      systemImage="trash"
                      role="destructive"
                      onPress={() => {
                        const gen = carouselItems[safeIndex]!.generator
                        Alert.alert(
                          t('generator.deleteGenerator'),
                          t('generator.deleteGeneratorConfirm', {
                            title: gen.title
                          }),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('common.delete'),
                              style: 'destructive',
                              onPress: async () => {
                                const result = await deleteGenerator(
                                  userId,
                                  gen.id
                                )
                                if (!result.ok)
                                  return Alert.alert(
                                    t('common.error'),
                                    result.error
                                  )
                                notifyWarning()
                              }
                            }
                          ]
                        )
                      }}
                    />
                  </SwiftMenu>
                ) : (
                  <SwiftButton
                    label={t('home.add')}
                    systemImage="plus"
                    modifiers={[labelStyle('iconOnly')]}
                    onPress={() => router.push('/generator/create')}
                  />
                )}
              </Host>
            ) : null
        }}
      />

      {generators.length === 0 ? (
        <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
          <EmptyState
            icon="bolt.slash"
            title={t('home.noGenerators')}
            description={
              admin
                ? t('home.noGeneratorsAdminDesc')
                : t('home.noGeneratorsDesc')
            }
            actionLabel={admin ? t('home.addGenerator') : undefined}
            onAction={
              admin ? () => router.push('/generator/create') : undefined
            }
          />
        </View>
      ) : (
        <SafeAreaView edges={{ bottom: true }} className="bg-background flex-1">
          <Animated.FlatList
            key={count}
            ref={flatListRef}
            data={loopedItems}
            keyExtractor={(_, index) => String(index)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={!looped}
            initialScrollIndex={loopOffset + initialPage}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index
            })}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={{ width: screenWidth, flex: 1 }}>
                <HeroCard item={item} userId={userId} />
              </View>
            )}
          />

          <PageIndicator
            count={carouselItems.length}
            scrollX={scrollX}
            pageWidth={screenWidth}
            statuses={statuses}
          />
        </SafeAreaView>
      )}
    </>
  )
}
