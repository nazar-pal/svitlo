import { SymbolView } from 'expo-symbols'
import { ListGroup, Separator, useThemeColor } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'

import { InvitationDialog } from '@/components/invitation-dialog'
import { SectionHeader } from '@/components/section-header'
import { getAllOrganizations, getAllUsers } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'
import { useTranslation } from '@/lib/i18n'

export function DrawerInvitationsSection() {
  const foregroundColor = useThemeColor('foreground')
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>(
    []
  )
  const { t } = useTranslation()
  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())
  const pendingInvitations = usePendingInvitations()
  const { data: allUsers } = useDrizzleQuery(getAllUsers())

  function getOrgName(orgId: string): string {
    return allOrgs.find(o => o.id === orgId)?.name ?? t('common.unknown')
  }

  function getInviterName(userId: string): string {
    return allUsers.find(u => u.id === userId)?.name ?? t('common.unknown')
  }

  if (pendingInvitations.length === 0) return null

  return (
    <>
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

      <InvitationDialog
        invitationIds={selectedInvitationIds}
        onClose={() => setSelectedInvitationIds([])}
      />
    </>
  )
}
