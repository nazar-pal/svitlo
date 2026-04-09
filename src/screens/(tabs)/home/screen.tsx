import { useRef, useState } from 'react'
import { Alert, useWindowDimensions, View } from 'react-native'
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-screens/experimental'
import { scheduleOnRN } from 'react-native-worklets'

import { storage } from '@/lib/storage'
import { EmptyState } from '@/components/empty-state'
import { deleteGenerator } from '@/data/client/mutations/generators'
import { impactLight, notifyWarning } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
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
import { buildHomeCarouselItems } from './lib/build-home-carousel-items'
import { useHomeData } from './lib/use-home-data'
import { useHomeReadiness } from './lib/use-home-readiness'

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
  const dataReady = useHomeReadiness({
    hasUserId: !!userId,
    hasGenerators: generators.length > 0,
    isOrgsLoading,
    hasUserOrgs: userOrgs.length > 0,
    hasSelectedOrg: !!selectedOrgId
  })

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
      <View
        testID="home-screen"
        className="bg-background flex-1 items-center justify-center px-5 pb-10"
      >
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

  const carouselItems: HeroCardItem[] = buildHomeCarouselItems({
    generators,
    sessionsByGenerator,
    assignmentsByGenerator,
    nextMaintenanceByGenerator,
    myActiveSession,
    users,
    admin
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
                    testID="home-actions-menu"
                    label={t('common.actions')}
                    systemImage="ellipsis.circle"
                    modifiers={[labelStyle('iconOnly')]}
                  >
                    <SwiftButton
                      testID="home-action-add"
                      label={t('home.addGenerator')}
                      systemImage="plus"
                      onPress={() => router.push('/generator/create')}
                    />
                    <SwiftButton
                      testID="home-action-settings"
                      label={t('generator.settings')}
                      systemImage="gearshape"
                      onPress={() =>
                        router.push(
                          `/generator/${carouselItems[safeIndex]!.generator.id}/settings`
                        )
                      }
                    />
                    <SwiftButton
                      testID="home-action-maintenance"
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
                      testID="home-action-delete"
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
                    testID="home-add-generator"
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
        <View
          testID="home-screen"
          className="bg-background flex-1 items-center justify-center px-5 pb-10"
        >
          <EmptyState
            testID="home-empty"
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
        <SafeAreaView
          testID="home-screen"
          edges={{ bottom: true }}
          className="bg-background flex-1"
        >
          <Animated.FlatList
            key={count}
            ref={flatListRef}
            data={loopedItems}
            keyExtractor={(item, index) => `${item.generator.id}-${index}`}
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
            extraData={currentIndex}
            removeClippedSubviews
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            renderItem={({ item, index }) => {
              const realIndex = looped ? index % count : index
              return (
                <View style={{ width: screenWidth, flex: 1 }}>
                  <HeroCard
                    item={item}
                    userId={userId}
                    isVisible={realIndex === currentIndex}
                  />
                </View>
              )
            }}
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
