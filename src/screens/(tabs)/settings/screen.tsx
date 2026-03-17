import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Button, ListGroup, Separator } from 'heroui-native'
import { Alert, ScrollView, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { SectionHeader } from '@/components/section-header'
import { cancelInvitation, removeMember } from '@/data/client/mutations'
import {
  getAllUsers,
  getOrganization,
  getOrgInvitations,
  getOrgMembers
} from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { getUserName } from '@/lib/utils/get-user-name'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

export default function SettingsScreen() {
  const router = useRouter()
  const { selectedOrgId } = useSelectedOrg()
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined

  const { userId } = useUserOrgs()

  // Selected organization
  const { data: orgData } = useDrizzleQuery(
    selectedOrgId ? getOrganization(selectedOrgId) : undefined
  )
  const org = orgData[0]

  // Organization members
  const { data: members } = useDrizzleQuery(
    selectedOrgId ? getOrgMembers(selectedOrgId) : undefined
  )

  // Outbound org invitations
  const { data: orgInvitations } = useDrizzleQuery(
    selectedOrgId ? getOrgInvitations(selectedOrgId) : undefined
  )

  // All users for resolving names
  const { data: users } = useDrizzleQuery(getAllUsers())

  const isAdmin = org?.adminUserId === userId
  const adminUser = users.find(u => u.id === org?.adminUserId)

  function getUserInfo(uid: string) {
    return {
      name: getUserName(users, uid),
      email: users.find(u => u.id === uid)?.email || ''
    }
  }

  async function handleRemoveMember(memberId: string) {
    Alert.alert(
      'Remove Member',
      'This will remove the member and reassign their generators to you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeMember(userId, memberId)
            if (!result.ok) Alert.alert('Error', result.error)
          }
        }
      ]
    )
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelInvitation(userId, invitationId)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  if (!org) return null

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        {/* Administrator */}
        <View className="gap-2">
          <SectionHeader title="Administrator" />
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView
                  name="person.fill"
                  size={20}
                  tintColor={foregroundColor}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {adminUser?.name || 'Unknown'}
                </ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {adminUser?.email || ''}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Members */}
        <View className="gap-2">
          <SectionHeader title={`Members (${members.length})`} />
          <ListGroup>
            {members.length === 0 ? (
              <ListGroup.Item>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle className="text-muted">
                    No members yet
                  </ListGroup.ItemTitle>
                </ListGroup.ItemContent>
              </ListGroup.Item>
            ) : (
              members.map((member, index) => {
                const info = getUserInfo(member.userId)
                return (
                  <View key={member.id}>
                    {index > 0 ? <Separator className="mx-4" /> : null}
                    <ListGroup.Item>
                      <ListGroup.ItemPrefix>
                        <SymbolView
                          name="person.fill"
                          size={18}
                          tintColor={foregroundColor}
                        />
                      </ListGroup.ItemPrefix>
                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle>{info.name}</ListGroup.ItemTitle>
                        <ListGroup.ItemDescription>
                          {info.email}
                        </ListGroup.ItemDescription>
                      </ListGroup.ItemContent>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onPress={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </ListGroup.Item>
                  </View>
                )
              })
            )}
          </ListGroup>
        </View>

        {/* Pending Org Invitations (Admin only) */}
        {isAdmin && orgInvitations.length > 0 ? (
          <View className="gap-2">
            <SectionHeader title="Pending Invitations" />
            <ListGroup>
              {orgInvitations.map((inv, index) => (
                <View key={inv.id}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  <ListGroup.Item>
                    <ListGroup.ItemPrefix>
                      <SymbolView
                        name="envelope.fill"
                        size={18}
                        tintColor={foregroundColor}
                      />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>
                        {inv.inviteeEmail}
                      </ListGroup.ItemTitle>
                    </ListGroup.ItemContent>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() => handleCancelInvitation(inv.id)}
                    >
                      Cancel
                    </Button>
                  </ListGroup.Item>
                </View>
              ))}
            </ListGroup>
          </View>
        ) : null}

        {/* Invite Member Button (Admin only) */}
        {isAdmin ? (
          <Button
            variant="primary"
            onPress={() => router.push(`/organization/${selectedOrgId}/invite`)}
          >
            Invite Member
          </Button>
        ) : null}
      </View>
    </ScrollView>
  )
}
