import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import {
  Avatar,
  Button,
  ListGroup,
  Separator,
  useThemeColor
} from 'heroui-native'
import { Alert, ScrollView, Text, View } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { SafeAreaView } from '@/components/uniwind'
import { acceptInvitation, declineInvitation } from '@/data/client/mutations'
import {
  getAllOrganizations,
  getAllUsers,
  getInvitationsByEmail
} from '@/data/client/queries'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
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
  const localUser = useLocalUser()
  const handleSignOut = useSignOut()
  const { userOrgs, userId } = useUserOrgs()
  const { selectedOrgId, setSelectedOrgId } = useSelectedOrg()
  const foregroundColor = useThemeColor('foreground')
  const accentColor = useThemeColor('accent')

  const userEmail = localUser?.email ?? ''
  const userName = localUser?.name || 'Unknown'

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  const normalizedEmail = userEmail.toLowerCase()

  const { data: pendingInvitations } = useDrizzleQuery(
    normalizedEmail ? getInvitationsByEmail(normalizedEmail) : undefined
  )

  const { data: allUsers } = useDrizzleQuery(getAllUsers())

  function getOrgName(orgId: string): string {
    return allOrgs.find(o => o.id === orgId)?.name ?? 'Unknown'
  }

  function getInviterName(userId: string): string {
    return allUsers.find(u => u.id === userId)?.name ?? 'Unknown'
  }

  async function handleAccept(invitationId: string) {
    const result = await acceptInvitation(userId, userEmail, invitationId)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  async function handleDecline(invitationId: string) {
    const result = await declineInvitation(userEmail, invitationId)
    if (!result.ok) Alert.alert('Error', result.error)
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
            {userOrgs.map((org, index) => (
              <View key={org.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item onPress={() => setSelectedOrgId(org.id)}>
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="building.2.fill"
                      size={20}
                      tintColor={foregroundColor}
                    />
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
              </View>
            ))}
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
                  <ListGroup.Item>
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
                    <View className="flex-row gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onPress={() => handleAccept(inv.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => handleDecline(inv.id)}
                      >
                        Decline
                      </Button>
                    </View>
                  </ListGroup.Item>
                </View>
              ))}
            </ListGroup>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer — Sign Out */}
      <View className="px-5 pt-2 pb-4">
        <Button variant="danger-soft" onPress={handleSignOut}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  )
}
