import {
  Host,
  Button as SwiftButton,
  Menu as SwiftMenu
} from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import { type DrawerContentComponentProps } from '@react-navigation/drawer'
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
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { CreateOrgDialog } from '@/components/create-org-dialog'
import { DeleteOrgDialog } from '@/components/delete-org-dialog'
import { LanguageMenu } from '@/components/language-menu'
import { LeaveOrgDialog } from '@/components/leave-org-dialog'
import { InvitationDialog } from '@/components/invitation-dialog'
import { SectionHeader } from '@/components/section-header'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { SafeAreaView } from '@/components/uniwind'
import { getAllOrganizations, getAllUsers } from '@/data/client/queries'
import { useSessionStatus } from '@/lib/auth/session-status-context'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { selection } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'
import { useTranslation } from '@/lib/i18n'
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
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null)
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false)
  const { t } = useTranslation()

  const userEmail = localUser?.email ?? ''
  const userName = localUser?.name || t('common.unknown')

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())
  const pendingInvitations = usePendingInvitations()
  const { data: allUsers } = useDrizzleQuery(getAllUsers())

  function getOrgName(orgId: string): string {
    return allOrgs.find(o => o.id === orgId)?.name ?? t('common.unknown')
  }

  function getInviterName(userId: string): string {
    return allUsers.find(u => u.id === userId)?.name ?? t('common.unknown')
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
        <View className="flex-row items-center gap-2">
          <SyncStatusIndicator />
          <Text className="text-muted text-xs">·</Text>
          <LanguageMenu />
        </View>
      </View>

      {/* Scrollable middle — Organizations & Invitations */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Organization */}
        <View className="gap-2">
          <SectionHeader title={t('drawer.organization')} />
          <ListGroup>
            {userOrgs.map((org, index) => (
              <View key={org.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item
                  className={
                    org.id === selectedOrgId ? 'bg-accent/10' : undefined
                  }
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
                    <ListGroup.ItemTitle
                      className={
                        org.id === selectedOrgId ? 'font-semibold' : undefined
                      }
                    >
                      {org.name}
                    </ListGroup.ItemTitle>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    <Host matchContents>
                      <SwiftMenu
                        label={t('common.actions')}
                        systemImage="ellipsis"
                        modifiers={[labelStyle('iconOnly')]}
                      >
                        {isAdmin(org.id) ? (
                          <>
                            <SwiftButton
                              label={t('drawer.rename')}
                              systemImage="pencil"
                              onPress={() =>
                                router.push(`/organization/${org.id}/rename`)
                              }
                            />
                            <SwiftButton
                              label={t('drawer.delete')}
                              systemImage="trash"
                              role="destructive"
                              onPress={() => setDeleteOrgId(org.id)}
                            />
                          </>
                        ) : (
                          <SwiftButton
                            label={t('drawer.leave')}
                            systemImage="rectangle.portrait.and.arrow.right"
                            role="destructive"
                            onPress={() => setLeaveOrgId(org.id)}
                          />
                        )}
                      </SwiftMenu>
                    </Host>
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </View>
            ))}
            <Separator className="mx-4" />
            <ListGroup.Item
              onPress={() => {
                navigation.dispatch(DrawerActions.closeDrawer())
                setIsCreateOrgOpen(true)
              }}
            >
              <ListGroup.ItemPrefix>
                <SymbolView name="plus" size={20} tintColor={foregroundColor} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {t('drawer.createOrganization')}
                </ListGroup.ItemTitle>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Invitations */}
        {pendingInvitations.length > 0 ? (
          <View className="gap-2">
            <SectionHeader title={t('drawer.invitations')} />
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
                        {t('drawer.invitedBy', {
                          name: getInviterName(inv.invitedByUserId)
                        })}
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

      <CreateOrgDialog
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
      />

      <InvitationDialog
        invitationIds={selectedInvitationIds}
        onClose={() => setSelectedInvitationIds([])}
      />

      <DeleteOrgDialog
        key={`delete-${deleteOrgId}`}
        orgId={deleteOrgId}
        onClose={() => setDeleteOrgId(null)}
        onDeleted={() => {
          router.navigate('/(protected)/(drawer)/(tabs)/(home)')
          navigation.dispatch(DrawerActions.closeDrawer())
        }}
      />

      <LeaveOrgDialog
        key={`leave-${leaveOrgId}`}
        orgId={leaveOrgId}
        onClose={() => setLeaveOrgId(null)}
        onLeft={() => {
          router.navigate('/(protected)/(drawer)/(tabs)/(home)')
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
            {t('common.signIn')}
          </Button>
        ) : null}
        <Button variant="danger-soft" onPress={handleSignOut}>
          {t('common.signOut')}
        </Button>
      </View>
    </SafeAreaView>
  )
}
