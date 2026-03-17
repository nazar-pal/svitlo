import { EmptyState } from '@/components/empty-state'
import { GeneratorCard } from '@/components/generator-card'
import { useGeneratorListData } from '@/lib/generator/use-generator-list-data'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { usePowerSync } from '@/lib/powersync'
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useRouter } from 'expo-router'
import { FlatList, View } from 'react-native'

export default function GeneratorsScreen() {
  const router = useRouter()
  const { userId } = usePowerSync()
  const { selectedOrgId } = useSelectedOrg()
  const { userOrgs, isAdmin } = useUserOrgs()

  const admin = isAdmin(selectedOrgId)

  const {
    generators: orgGenerators,
    sessionsByGenerator,
    nextMaintenanceByGenerator
  } = useGeneratorListData()

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
              userId={userId ?? ''}
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
