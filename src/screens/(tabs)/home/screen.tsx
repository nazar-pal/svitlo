import { useState } from 'react'
import { Alert, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-screens/experimental'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue
} from 'react-native-reanimated'

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
import { Stack, useRouter } from 'expo-router'

import { HeroCard, type HeroCardItem } from './components/hero-card'
import { PageIndicator } from './components/page-indicator'
import { useHomeData } from './lib/use-home-data'

function CarouselPage({
  item,
  index,
  scrollX,
  width,
  userId
}: {
  item: HeroCardItem
  index: number
  scrollX: SharedValue<number>
  width: number
  userId: string
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      transform: [
        {
          scale: interpolate(scrollX.value, input, [0.92, 1, 0.92], 'clamp')
        },
        {
          translateY: interpolate(scrollX.value, input, [8, 0, 8], 'clamp')
        }
      ],
      opacity: interpolate(scrollX.value, input, [0.6, 1, 0.6], 'clamp')
    }
  })

  return (
    <Animated.View
      style={[{ width }, animatedStyle]}
      className="flex-1 px-5 py-4"
    >
      <HeroCard item={item} userId={userId} />
    </Animated.View>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { width: screenWidth } = useWindowDimensions()
  const scrollX = useSharedValue(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  const {
    userId,
    userOrgs,
    admin,
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users,
    myActiveSession,
    myActiveGenerator,
    grouped
  } = useHomeData()

  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x
  })

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

  // Build flat carousel items: active session first, then running, resting, available
  function buildItem(
    g: (typeof generators)[number],
    isMyActive: boolean
  ): HeroCardItem {
    const sessions = sessionsByGenerator.get(g.id) ?? []
    const assignments = assignmentsByGenerator.get(g.id) ?? []
    return {
      generator: g,
      statusInfo: computeGeneratorStatus(g, sessions),
      nextMaintenance: nextMaintenanceByGenerator.get(g.id) ?? null,
      isMyActiveSession: isMyActive,
      lifetimeHours: computeLifetimeHours(sessions),
      assignedUserNames: admin
        ? assignments.map(a => getUserName(users, a.userId))
        : []
    }
  }

  const carouselItems: HeroCardItem[] = []

  if (myActiveGenerator && myActiveSession)
    carouselItems.push(buildItem(myActiveGenerator, true))

  for (const group of [grouped.running, grouped.resting, grouped.available])
    for (const g of group) carouselItems.push(buildItem(g, false))

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
            data={carouselItems}
            keyExtractor={item => item.generator.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index
            })}
            onMomentumScrollEnd={e => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / screenWidth
              )
              if (newIndex !== currentIndex) {
                setCurrentIndex(newIndex)
                impactLight()
              }
            }}
            renderItem={({ item, index }) => (
              <CarouselPage
                item={item}
                index={index}
                scrollX={scrollX}
                width={screenWidth}
                userId={userId}
              />
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
