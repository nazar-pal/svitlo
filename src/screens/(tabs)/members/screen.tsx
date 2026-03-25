import { EmptyState } from '@/components/empty-state'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SectionHeader } from '@/components/section-header'
import { useTranslation } from '@/lib/i18n'
import {
  alertOnError,
  cancelInvitation,
  removeMember
} from '@/data/client/mutations'
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
import {
  Button,
  Chip,
  ListGroup,
  Separator,
  useThemeColor
} from 'heroui-native'
import { Alert, ScrollView, View } from 'react-native'

export default function MembersScreen() {
  const { selectedOrgId } = useSelectedOrg()
  const { t } = useTranslation()
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

  function getUserInfo(uid: string) {
    return {
      name: getUserName(users, uid),
      email: users.find(u => u.id === uid)?.email || ''
    }
  }

  async function handleRemoveMember(memberId: string) {
    Alert.alert(t('members.removeMember'), t('members.removeMemberDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: async () => {
          const result = await removeMember(userId, memberId)
          if (alertOnError(result)) return
          notifyWarning()
        }
      }
    ])
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelInvitation(userId, invitationId)
    if (alertOnError(result)) return
    notifyWarning()
  }

  const query = searchText.toLowerCase()

  // Unified list: admin first, then members (deduplicated)
  const allPeople: {
    userId: string
    memberId?: string
    info: { name: string; email: string }
    isAdmin: boolean
    isYou: boolean
  }[] = []

  if (org?.adminUserId) {
    allPeople.push({
      userId: org.adminUserId,
      info: getUserInfo(org.adminUserId),
      isAdmin: true,
      isYou: org.adminUserId === userId
    })
  }

  for (const m of members) {
    if (m.userId === org?.adminUserId) continue
    allPeople.push({
      userId: m.userId,
      memberId: m.id,
      info: getUserInfo(m.userId),
      isAdmin: false,
      isYou: m.userId === userId
    })
  }

  const filteredPeople = query
    ? allPeople.filter(
        ({ info }) =>
          info.name.toLowerCase().includes(query) ||
          info.email.toLowerCase().includes(query)
      )
    : allPeople
  const filteredInvitations = query
    ? orgInvitations.filter(inv =>
        inv.inviteeEmail.toLowerCase().includes(query)
      )
    : orgInvitations
  const hasNoResults =
    query && filteredPeople.length === 0 && filteredInvitations.length === 0

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
                placeholder: t('members.searchMembers'),
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
              title={t('members.noResults', { query: searchText })}
            />
          ) : (
            <>
              {/* Members */}
              <View className="gap-2">
                <SectionHeader
                  title={
                    query
                      ? t('members.members')
                      : t('members.membersCount', { count: allPeople.length })
                  }
                />
                <ListGroup>
                  {filteredPeople.length === 0 ? (
                    <ListGroup.Item>
                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle className="text-muted">
                          {query
                            ? t('members.noMatchingMembers')
                            : t('members.noMembersYet')}
                        </ListGroup.ItemTitle>
                      </ListGroup.ItemContent>
                    </ListGroup.Item>
                  ) : (
                    filteredPeople.map((person, index) => {
                      const { memberId } = person
                      return (
                        <View key={person.userId}>
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
                                {person.info.name}
                              </ListGroup.ItemTitle>
                              <ListGroup.ItemDescription>
                                {person.info.email}
                              </ListGroup.ItemDescription>
                              {(person.isAdmin || person.isYou) && (
                                <View className="mt-1 flex-row gap-1.5">
                                  {person.isAdmin && (
                                    <Chip
                                      size="sm"
                                      variant="soft"
                                      color="warning"
                                    >
                                      {t('members.admin')}
                                    </Chip>
                                  )}
                                  {person.isYou && (
                                    <Chip
                                      size="sm"
                                      variant="soft"
                                      color="accent"
                                    >
                                      {t('members.you')}
                                    </Chip>
                                  )}
                                </View>
                              )}
                            </ListGroup.ItemContent>
                            {isAdmin && memberId && (
                              <Button
                                size="sm"
                                variant="danger-soft"
                                onPress={() => handleRemoveMember(memberId)}
                              >
                                {t('common.remove')}
                              </Button>
                            )}
                          </ListGroup.Item>
                        </View>
                      )
                    })
                  )}
                </ListGroup>
              </View>

              {/* Pending Org Invitations (Admin only) */}
              {isAdmin && filteredInvitations.length > 0 ? (
                <View className="gap-2">
                  <SectionHeader title={t('members.pendingInvitations')} />
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
                            {t('common.cancel')}
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
