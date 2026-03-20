import {
  type DrawerContentComponentProps,
  useDrawerStatus
} from '@react-navigation/drawer'
import { DrawerActions } from '@react-navigation/native'
import { useNavigation, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import {
  Avatar,
  Button,
  ListGroup,
  Separator,
  useThemeColor
} from 'heroui-native'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

import { DeleteOrgDialog } from '@/components/delete-org-dialog'
import { InvitationDialog } from '@/components/invitation-dialog'
import { SwipeableRow } from '@/components/swipeable-row'
import { SectionHeader } from '@/components/section-header'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { SafeAreaView } from '@/components/uniwind'
import { useSessionStatus } from '@/lib/auth/session-status-context'
import { selection } from '@/lib/haptics'
import { getAllOrganizations, getAllUsers } from '@/data/client/queries'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AppDrawerContent(_props: DrawerContentComponentProps) {
  const router = useRouter()
  const navigation = useNavigation()
  const localUser = useLocalUser()
  const handleSignOut = useSignOut()
  const { sessionStatus } = useSessionStatus()
  const { userOrgs, isAdmin } = useUserOrgs()
  const { selectedOrgId, setSelectedOrgId } = useSelectedOrg()
  const foregroundColor = useThemeColor('foreground')
  const accentColor = useThemeColor('accent')
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>(
    []
  )
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const openRowRef = useRef<SwipeableMethods | null>(null)
  const drawerStatus = useDrawerStatus()

  // Reset any revealed swipeable row when the drawer closes so it
  // doesn't stay open the next time the drawer is shown.
  useEffect(() => {
    if (drawerStatus === 'closed') openRowRef.current?.close()
  }, [drawerStatus])

  const userEmail = localUser?.email ?? ''
  const userName = localUser?.name || 'Unknown'

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())
  const pendingInvitations = usePendingInvitations()
  const { data: allUsers } = useDrizzleQuery(getAllUsers())

  function getOrgName(orgId: string): string {
    return allOrgs.find(o => o.id === orgId)?.name ?? 'Unknown'
  }

  function getInviterName(userId: string): string {
    return allUsers.find(u => u.id === userId)?.name ?? 'Unknown'
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      {/* Header — Account */}
      <View className="items-center gap-2 py-8">
        <Avatar size="lg" color="accent" alt={userName}>
          {localUser?.image ? (
            <Avatar.Image source={{ uri: localUser.image }} />
          ) : null}
          <Avatar.Fallback>{getInitials(userName)}</Avatar.Fallback>
        </Avatar>
        <Text className="text-foreground text-lg font-semibold">
          {userName}
        </Text>
        <Text className="text-muted text-sm">{userEmail}</Text>
        <SyncStatusIndicator />
      </View>

      {/* Scrollable middle — Organizations & Invitations */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Organization */}
        <View className="gap-2">
          <SectionHeader title="Organization" />
          <ListGroup>
            {userOrgs.map((org, index) => {
              const orgItem = (
                <ListGroup.Item
                  onPress={() => {
                    selection()
                    setSelectedOrgId(org.id)
                  }}
                >
                  <ListGroup.ItemPrefix>
                    <View>
                      <SymbolView
                        name="building.2.fill"
                        size={20}
                        tintColor={foregroundColor}
                      />
                      {isAdmin(org.id) ? (
                        <View className="bg-background absolute -right-1 -bottom-1 rounded-full p-px">
                          <SymbolView
                            name="shield.fill"
                            size={10}
                            tintColor={accentColor}
                          />
                        </View>
                      ) : null}
                    </View>
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{org.name}</ListGroup.ItemTitle>
                  </ListGroup.ItemContent>
                  {org.id === selectedOrgId ? (
                    <ListGroup.ItemSuffix>
                      <SymbolView
                        name="checkmark"
                        size={16}
                        tintColor={accentColor}
                      />
                    </ListGroup.ItemSuffix>
                  ) : null}
                </ListGroup.Item>
              )

              return (
                <View key={org.id}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  {isAdmin(org.id) ? (
                    <SwipeableRow
                      onEdit={() => {
                        openRowRef.current?.close()
                        router.push(`/organization/${org.id}/rename`)
                      }}
                      onDelete={() => {
                        openRowRef.current?.close()
                        setDeleteOrgId(org.id)
                      }}
                      side="left"
                      openRowRef={openRowRef}
                    >
                      {orgItem}
                    </SwipeableRow>
                  ) : (
                    orgItem
                  )}
                </View>
              )
            })}
            <Separator className="mx-4" />
            <ListGroup.Item onPress={() => router.push('/organization/create')}>
              <ListGroup.ItemPrefix>
                <SymbolView name="plus" size={20} tintColor={foregroundColor} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Create Organization</ListGroup.ItemTitle>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Invitations */}
        {pendingInvitations.length > 0 ? (
          <View className="gap-2">
            <SectionHeader title="Invitations" />
            <ListGroup>
              {pendingInvitations.map((inv, index) => (
                <View key={inv.id}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  <ListGroup.Item
                    onPress={() => setSelectedInvitationIds([inv.id])}
                  >
                    <ListGroup.ItemPrefix>
                      <SymbolView
                        name="envelope.fill"
                        size={20}
                        tintColor={foregroundColor}
                      />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>
                        {getOrgName(inv.organizationId)}
                      </ListGroup.ItemTitle>
                      <ListGroup.ItemDescription>
                        Invited by {getInviterName(inv.invitedByUserId)}
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix
                      iconProps={{ size: 14, color: foregroundColor }}
                    />
                  </ListGroup.Item>
                </View>
              ))}
            </ListGroup>
          </View>
        ) : null}
      </ScrollView>

      <InvitationDialog
        invitationIds={selectedInvitationIds}
        onClose={() => setSelectedInvitationIds([])}
      />

      <DeleteOrgDialog
        key={deleteOrgId}
        orgId={deleteOrgId}
        onClose={() => setDeleteOrgId(null)}
        onDeleted={() => {
          // Navigate to dashboard to avoid stale org-specific tab content
          router.navigate('/(protected)/(drawer)/(tabs)/(dashboard)')
          navigation.dispatch(DrawerActions.closeDrawer())
        }}
      />

      {/* Footer */}
      <View className="gap-2 px-5 pt-2 pb-4">
        {sessionStatus === 'expired' ? (
          <Button
            variant="primary"
            onPress={() => router.push('/(protected)/re-auth')}
          >
            Sign In
          </Button>
        ) : null}
        <Button variant="danger-soft" onPress={handleSignOut}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  )
}
