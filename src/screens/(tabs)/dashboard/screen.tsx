import { Stack, useRouter } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'

import { ActiveSessionCard } from './cards/active-session-card'
import { AllClearCard } from './cards/all-clear-card'
import { MyGeneratorCard } from './cards/my-generator-card'
import { OverdueMaintenanceItem } from './cards/overdue-maintenance-item'
import { RestingGeneratorItem } from './cards/resting-generator-item'
import { UpcomingMaintenanceItem } from './cards/upcoming-maintenance-item'
import { WarningGeneratorItem } from './cards/warning-generator-item'
import { useDashboardData } from './use-dashboard-data'

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-muted mb-2 ml-1 text-xs font-semibold tracking-wide uppercase">
      {title}
    </Text>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const {
    userId,
    userOrgs,
    sessionsByGenerator,
    statusByGenerator,
    nextMaintenanceByGenerator,
    usersById,
    myActiveSession,
    myActiveGenerator,
    warningGenerators,
    overdueItems,
    restingGenerators,
    upcomingItems,
    hasAttentionItems,
    myGenerators
  } = useDashboardData()

  if (userOrgs.length === 0)
    return (
      <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="building.2"
          title="No Organizations"
          description="Create an organization or accept an invitation to get started."
          actionLabel="Go to Settings"
          onAction={() => router.push('/settings')}
        />
      </View>
    )

  return (
    <>
      <Stack.Screen options={{ headerShown: true }} />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-4"
      >
        <View className="mx-auto w-full max-w-[600px]">
          {/* Section 1 — My Active Session */}
          {myActiveGenerator && myActiveSession ? (
            <View className="mb-6">
              <ActiveSessionCard
                generator={myActiveGenerator}
                session={myActiveSession}
                sessions={sessionsByGenerator.get(myActiveGenerator.id) ?? []}
                userId={userId}
              />
            </View>
          ) : null}

          {/* Section 2 — My Generators */}
          {myGenerators.length > 0 ? (
            <View className="mb-6">
              <SectionHeader title="My Generators" />
              <View className="gap-3">
                {myGenerators.map(gen => (
                  <MyGeneratorCard
                    key={gen.id}
                    generator={gen}
                    sessions={sessionsByGenerator.get(gen.id) ?? []}
                    nextMaintenance={
                      nextMaintenanceByGenerator.get(gen.id) ?? null
                    }
                    userId={userId}
                    onPress={() => router.push(`/generator/${gen.id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 3 — Attention Required */}
          <View className="mb-6">
            <SectionHeader title="Attention Required" />
            {hasAttentionItems ? (
              <View className="gap-3">
                {warningGenerators.map(gen => {
                  const { openSession } = statusByGenerator.get(gen.id)!
                  const startedByName = openSession
                    ? usersById.get(openSession.startedByUserId)?.name ||
                      'Unknown'
                    : 'Unknown'
                  return (
                    <WarningGeneratorItem
                      key={gen.id}
                      generator={gen}
                      sessions={sessionsByGenerator.get(gen.id) ?? []}
                      startedByName={startedByName}
                      onPress={() => router.push(`/generator/${gen.id}`)}
                    />
                  )
                })}

                {overdueItems.map(({ gen, next }) => (
                  <OverdueMaintenanceItem
                    key={`${gen.id}-${next.templateId}`}
                    generatorName={gen.name}
                    taskName={next.taskName}
                    hoursRemaining={next.hoursRemaining}
                    daysRemaining={next.daysRemaining}
                    onPress={() => router.push(`/generator/${gen.id}`)}
                  />
                ))}

                {restingGenerators.map(gen => {
                  const { restEndsAt } = statusByGenerator.get(gen.id)!
                  if (!restEndsAt) return null
                  return (
                    <RestingGeneratorItem
                      key={gen.id}
                      generator={gen}
                      restEndsAt={restEndsAt}
                      onPress={() => router.push(`/generator/${gen.id}`)}
                    />
                  )
                })}
              </View>
            ) : (
              <AllClearCard />
            )}
          </View>

          {/* Section 4 — Upcoming Maintenance */}
          {upcomingItems.length > 0 ? (
            <View>
              <SectionHeader title="Upcoming Maintenance" />
              <View className="gap-3">
                {upcomingItems.map(({ gen, next }) => (
                  <UpcomingMaintenanceItem
                    key={`${gen.id}-${next.templateId}`}
                    generatorName={gen.name}
                    taskName={next.taskName}
                    info={next}
                    onPress={() => router.push(`/generator/${gen.id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  )
}
