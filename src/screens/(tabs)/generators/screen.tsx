import { EmptyState } from '@/components/empty-state'
import { GeneratorCard } from '@/components/generator-card'
import {
  generators,
  generatorSessions,
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeNextMaintenance,
  type NextMaintenanceCardInfo
} from '@/lib/hooks/use-maintenance-due'
import { useSelectedOrg } from '@/lib/hooks/use-selected-org'
import { useUserOrgs } from '@/lib/hooks/use-user-orgs'
import { groupBy } from '@/lib/group-by'
import { db } from '@/lib/powersync/database'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { eq } from 'drizzle-orm'
import { Stack, useRouter } from 'expo-router'
import { FlatList, View } from 'react-native'

export default function GeneratorsScreen() {
  const router = useRouter()
  const { selectedOrgId } = useSelectedOrg()
  const { userOrgs, isAdmin } = useUserOrgs()

  const admin = isAdmin(selectedOrgId)

  const { data: orgGenerators } = useDrizzleQuery(
    selectedOrgId
      ? db
          .select()
          .from(generators)
          .where(eq(generators.organizationId, selectedOrgId))
      : undefined
  )

  const { data: allSessions } = useDrizzleQuery(db =>
    db.select().from(generatorSessions)
  )

  const { data: allTemplates } = useDrizzleQuery(db =>
    db.select().from(maintenanceTemplates)
  )

  const { data: allRecords } = useDrizzleQuery(db =>
    db.select().from(maintenanceRecords)
  )

  const sessionsByGenerator = groupBy(allSessions, s => s.generatorId)
  const templatesByGenerator = groupBy(allTemplates, t => t.generatorId)
  const recordsByGenerator = groupBy(allRecords, r => r.generatorId)

  const nextMaintenanceByGenerator = new Map<
    string,
    NextMaintenanceCardInfo | null
  >()
  for (const gen of orgGenerators ?? []) {
    nextMaintenanceByGenerator.set(
      gen.id,
      computeNextMaintenance(
        templatesByGenerator.get(gen.id) ?? [],
        recordsByGenerator.get(gen.id) ?? [],
        sessionsByGenerator.get(gen.id) ?? []
      )
    )
  }

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
      <FlatList
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        data={orgGenerators}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="mb-3">
            <GeneratorCard
              generator={item}
              sessions={sessionsByGenerator.get(item.id) ?? []}
              nextMaintenance={nextMaintenanceByGenerator.get(item.id) ?? null}
              onPress={() => router.push(`/generator/${item.id}`)}
            />
          </View>
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
