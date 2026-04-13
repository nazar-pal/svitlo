import { EmptyState } from '@/components/empty-state'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SectionHeader } from '@/components/section-header'
import { useTranslation } from '@/lib/i18n'
import {
  useCanCancelInvitation,
  useCanCreateInvitation
} from '@/data/client/invitations/policy-hooks'
import { useCanRemoveMember } from '@/data/client/members/policy-hooks'
import { cancelInvitation, removeMember } from '@/data/client/mutations'
import {
  getAllUsers,
  getOrganization,
  getOrgInvitations,
  getOrgMembers
} from '@/data/client/queries'
import { runMutation } from '@/lib/alerts'
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

import {
  buildMemberList,
  type MemberListInvitation,
  type MemberListPerson
} from './lib/build-member-list'

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
  // Pending-invitations section gate — a direct admin check is enough here
  // because non-admins shouldn't see the section at all. The per-row Remove /
  // Cancel affordances use reactive policy hooks instead.
  const canManageOrg = org?.adminUserId === userId

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

  const createInvitePolicy = useCanCreateInvitation(userId, selectedOrgId)
  const canInvite =
    createInvitePolicy.status === 'ready' && createInvitePolicy.ok

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
        onPress: () =>
          runMutation(() => removeMember(userId, memberId), {
            feedback: 'warning'
          })
      }
    ])
  }

  async function handleCancelInvitation(invitationId: string) {
    await runMutation(() => cancelInvitation(userId, invitationId), {
      feedback: 'warning'
    })
  }

  const {
    people: allPeople,
    filteredPeople,
    filteredInvitations,
    hasNoResults
  } = buildMemberList({
    adminUserId: org?.adminUserId,
    members,
    invitations: orgInvitations,
    currentUserId: userId,
    searchQuery: searchText,
    getUserInfo
  })

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
            canInvite ? (
              <HeaderSubmitButton
                testID="members-invite-button"
                systemImage="person.badge.plus"
                onPress={() =>
                  router.push(`/organization/${selectedOrgId}/invite`)
                }
              />
            ) : null
        }}
      />
      <ScrollView
        testID="members-screen"
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
                    searchText
                      ? t('members.members')
                      : t('members.membersCount', { count: allPeople.length })
                  }
                />
                <ListGroup>
                  {filteredPeople.length === 0 ? (
                    <ListGroup.Item>
                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle className="text-muted">
                          {searchText
                            ? t('members.noMatchingMembers')
                            : t('members.noMembersYet')}
                        </ListGroup.ItemTitle>
                      </ListGroup.ItemContent>
                    </ListGroup.Item>
                  ) : (
                    filteredPeople.map((person, index) => (
                      <View key={person.userId}>
                        {index > 0 ? <Separator className="mx-4" /> : null}
                        <MemberRow
                          person={person}
                          userId={userId}
                          foregroundColor={foregroundColor}
                          onRemove={handleRemoveMember}
                        />
                      </View>
                    ))
                  )}
                </ListGroup>
              </View>

              {/* Pending Org Invitations (Admin only) */}
              {canManageOrg && filteredInvitations.length > 0 ? (
                <View className="gap-2">
                  <SectionHeader
                    testID="members-pending-invitations-header"
                    title={t('members.pendingInvitations')}
                  />
                  <ListGroup>
                    {filteredInvitations.map((inv, index) => (
                      <View key={inv.id}>
                        {index > 0 ? <Separator className="mx-4" /> : null}
                        <PendingInvitationRow
                          invitation={inv}
                          userId={userId}
                          foregroundColor={foregroundColor}
                          onCancel={handleCancelInvitation}
                        />
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

function MemberRow({
  person,
  userId,
  foregroundColor,
  onRemove
}: {
  person: MemberListPerson
  userId: string
  foregroundColor: string
  onRemove: (memberId: string) => void
}) {
  const { t } = useTranslation()
  const { memberId } = person
  const policy = useCanRemoveMember(userId, memberId)
  const canRemove = policy.status === 'ready' && policy.ok

  return (
    <ListGroup.Item>
      <ListGroup.ItemPrefix>
        <SymbolView name="person.fill" size={18} tintColor={foregroundColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{person.info.name}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>
          {person.info.email}
        </ListGroup.ItemDescription>
        {(person.isAdmin || person.isYou) && (
          <View className="mt-1 flex-row gap-1.5">
            {person.isAdmin && (
              <Chip size="sm" variant="soft" color="warning">
                {t('members.admin')}
              </Chip>
            )}
            {person.isYou && (
              <Chip size="sm" variant="soft" color="accent">
                {t('members.you')}
              </Chip>
            )}
          </View>
        )}
      </ListGroup.ItemContent>
      {canRemove && memberId && (
        <Button
          size="sm"
          variant="danger-soft"
          onPress={() => onRemove(memberId)}
        >
          {t('common.remove')}
        </Button>
      )}
    </ListGroup.Item>
  )
}

function PendingInvitationRow({
  invitation,
  userId,
  foregroundColor,
  onCancel
}: {
  invitation: MemberListInvitation
  userId: string
  foregroundColor: string
  onCancel: (invitationId: string) => void
}) {
  const { t } = useTranslation()
  const policy = useCanCancelInvitation(userId, invitation.id)
  const canCancel = policy.status === 'ready' && policy.ok

  return (
    <ListGroup.Item>
      <ListGroup.ItemPrefix>
        <SymbolView
          name="envelope.fill"
          size={18}
          tintColor={foregroundColor}
        />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{invitation.inviteeEmail}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      {canCancel && (
        <Button
          size="sm"
          variant="danger-soft"
          onPress={() => onCancel(invitation.id)}
        >
          {t('common.cancel')}
        </Button>
      )}
    </ListGroup.Item>
  )
}
