import { EmptyState } from '@/components/empty-state'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SectionHeader } from '@/components/section-header'
import { cancelInvitation, removeMember } from '@/data/client/mutations'
import {
  getAllUsers,
  getOrganization,
  getOrgInvitations,
  getOrgMembers
} from '@/data/client/queries'
import { notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { getUserName } from '@/lib/utils/get-user-name'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Button, ListGroup, Separator, useThemeColor } from 'heroui-native'
import { Alert, ScrollView, View } from 'react-native'

export default function MembersScreen() {
  const { selectedOrgId } = useSelectedOrg()
  const foregroundColor = useThemeColor('foreground')
  const router = useRouter()
  const { q } = useLocalSearchParams<{ q?: string }>()
  const searchText = q ?? ''

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
            if (!result.ok) return Alert.alert('Error', result.error)
            notifyWarning()
          }
        }
      ]
    )
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelInvitation(userId, invitationId)
    if (!result.ok) return Alert.alert('Error', result.error)
    notifyWarning()
  }

  const query = searchText.toLowerCase()
  const membersWithInfo = members.map(m => ({
    member: m,
    info: getUserInfo(m.userId)
  }))
  const filteredMembers = query
    ? membersWithInfo.filter(
        ({ info }) =>
          info.name.toLowerCase().includes(query) ||
          info.email.toLowerCase().includes(query)
      )
    : membersWithInfo
  const filteredInvitations = query
    ? orgInvitations.filter(inv =>
        inv.inviteeEmail.toLowerCase().includes(query)
      )
    : orgInvitations
  const showAdmin =
    !query ||
    adminUser?.name?.toLowerCase().includes(query) ||
    adminUser?.email?.toLowerCase().includes(query)
  const hasNoResults =
    query &&
    !showAdmin &&
    filteredMembers.length === 0 &&
    filteredInvitations.length === 0

  if (!org) return null

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: selectedOrgId
            ? {
                headerIconColor: foregroundColor,
                tintColor: foregroundColor,
                textColor: foregroundColor,
                hintTextColor: foregroundColor,
                placeholder: 'Search members',
                autoCapitalize: 'none',
                onChangeText: e => router.setParams({ q: e.nativeEvent.text })
              }
            : undefined,
          headerRight: () =>
            isAdmin ? (
              <HeaderSubmitButton
                systemImage="person.badge.plus"
                onPress={() =>
                  router.push(`/organization/${selectedOrgId}/invite`)
                }
              />
            ) : null
        }}
      />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          {hasNoResults ? (
            <EmptyState
              icon="magnifyingglass"
              title={`No results for "${searchText}"`}
            />
          ) : (
            <>
              {/* Administrator */}
              {showAdmin ? (
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
              ) : null}

              {/* Members */}
              <View className="gap-2">
                <SectionHeader
                  title={query ? 'Members' : `Members (${members.length})`}
                />
                <ListGroup>
                  {filteredMembers.length === 0 ? (
                    <ListGroup.Item>
                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle className="text-muted">
                          {query ? 'No matching members' : 'No members yet'}
                        </ListGroup.ItemTitle>
                      </ListGroup.ItemContent>
                    </ListGroup.Item>
                  ) : (
                    filteredMembers.map(({ member, info }, index) => (
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
                            <ListGroup.ItemTitle>
                              {info.name}
                            </ListGroup.ItemTitle>
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
                    ))
                  )}
                </ListGroup>
              </View>

              {/* Pending Org Invitations (Admin only) */}
              {isAdmin && filteredInvitations.length > 0 ? (
                <View className="gap-2">
                  <SectionHeader title="Pending Invitations" />
                  <ListGroup>
                    {filteredInvitations.map((inv, index) => (
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
            </>
          )}
        </View>
      </ScrollView>
    </>
  )
}
