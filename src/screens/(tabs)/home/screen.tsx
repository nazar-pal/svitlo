import { EmptyState } from '@/components/empty-state'
import { GeneratorCard } from '@/components/generator-card'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useRouter } from 'expo-router'
import { View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'

import { ActiveSessionCard } from './components/active-session-card'
import { useHomeData } from './lib/use-home-data'

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
    myActiveGenerator
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
      <Animated.FlatList
        className="bg-background flex-1"
        contentContainerClassName="px-5 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        data={generators.filter(g => g.id !== myActiveGenerator?.id)}
        keyExtractor={item => item.id}
        itemLayoutAnimation={LinearTransition}
        ListHeaderComponent={
          myActiveGenerator && myActiveSession ? (
            <View className="mb-3">
              <ActiveSessionCard
                generator={myActiveGenerator}
                session={myActiveSession}
                sessions={sessionsByGenerator.get(myActiveGenerator.id) ?? []}
                userId={userId}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Animated.View className="mb-3" entering={FadeIn.duration(200)}>
            <GeneratorCard
              variant="compact"
              generator={item}
              sessions={sessionsByGenerator.get(item.id) ?? []}
              nextMaintenance={nextMaintenanceByGenerator.get(item.id) ?? null}
              userId={userId}
              onPress={() => router.push(`/generator/${item.id}`)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
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
        }
      />
    </>
  )
}
