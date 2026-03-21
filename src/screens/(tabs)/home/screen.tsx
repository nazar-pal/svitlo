import { EmptyState } from '@/components/empty-state'
import { GeneratorCard } from '@/components/generator-card'
import { SectionHeader } from '@/components/section-header'
import type { Generator } from '@/data/client/db-schema'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useRouter } from 'expo-router'
import { View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'

import { ActiveSessionCard } from './components/active-session-card'
import { FleetSummary } from './components/fleet-summary'
import { useHomeData } from './lib/use-home-data'

type HomeListItem =
  | { type: 'section-header'; key: string; title: string }
  | { type: 'generator'; key: string; data: Generator }

export default function HomeScreen() {
  const router = useRouter()
  const {
    userId,
    userOrgs,
    admin,
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    myActiveSession,
    myActiveGenerator,
    grouped,
    statusCounts
  } = useHomeData()

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

  const items: HomeListItem[] = []
  for (const [title, gens] of [
    ['Running', grouped.running],
    ['Resting', grouped.resting],
    ['Available', grouped.available]
  ] as const) {
    if (gens.length === 0) continue
    items.push({ type: 'section-header', key: `header-${title}`, title })
    for (const g of gens) items.push({ type: 'generator', key: g.id, data: g })
  }

  const listHeader = (
    <>
      {generators.length > 1 ? (
        <View className="mb-4">
          <FleetSummary {...statusCounts} />
        </View>
      ) : null}

      {myActiveGenerator && myActiveSession ? (
        <View className="mb-4">
          <ActiveSessionCard
            generator={myActiveGenerator}
            session={myActiveSession}
            sessions={sessionsByGenerator.get(myActiveGenerator.id) ?? []}
            userId={userId}
          />
        </View>
      ) : null}
    </>
  )

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerRight: () =>
            admin ? (
              <Host matchContents>
                <SwiftButton
                  label="Add"
                  systemImage="plus"
                  modifiers={[labelStyle('iconOnly')]}
                  onPress={() => router.push('/generator/create')}
                />
              </Host>
            ) : null
        }}
      />

      {generators.length === 0 ? (
        <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
          <EmptyState
            icon="bolt.slash"
            title="No Generators"
            description={
              admin
                ? 'Add your first generator to start tracking.'
                : 'No generators assigned to you yet.'
            }
            actionLabel={admin ? 'Add Generator' : undefined}
            onAction={
              admin ? () => router.push('/generator/create') : undefined
            }
          />
        </View>
      ) : (
        <Animated.FlatList
          className="bg-background flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-5 pb-10 pt-4"
          data={items}
          keyExtractor={item => item.key}
          itemLayoutAnimation={LinearTransition}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => {
            switch (item.type) {
              case 'section-header':
                return (
                  <View className="mt-4 mb-1">
                    <SectionHeader title={item.title} />
                  </View>
                )
              case 'generator':
                return (
                  <Animated.View
                    className="mb-3"
                    entering={FadeIn.duration(200)}
                  >
                    <GeneratorCard
                      variant="compact"
                      generator={item.data}
                      sessions={sessionsByGenerator.get(item.data.id) ?? []}
                      nextMaintenance={
                        nextMaintenanceByGenerator.get(item.data.id) ?? null
                      }
                      userId={userId}
                      onPress={() => router.push(`/generator/${item.data.id}`)}
                    />
                  </Animated.View>
                )
              default:
                throw new Error(`Unknown item type: ${item satisfies never}`)
            }
          }}
        />
      )}
    </>
  )
}
