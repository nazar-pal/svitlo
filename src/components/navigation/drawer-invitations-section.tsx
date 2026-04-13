import { SymbolView } from 'expo-symbols'
import { ListGroup, Separator, useThemeColor } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'

import { InvitationDialog } from '@/components/invitation-dialog'
import { SectionHeader } from '@/components/section-header'
import {
  usePendingInvitations,
  type InvitationDetails
} from '@/lib/hooks/use-pending-invitations'
import { useTranslation } from '@/lib/i18n'

export function DrawerInvitationsSection() {
  const foregroundColor = useThemeColor('foreground')
  const [selectedInvitations, setSelectedInvitations] = useState<
    InvitationDetails[]
  >([])
  const { t } = useTranslation()
  const pendingInvitations = usePendingInvitations()

  if (pendingInvitations.length === 0) return null

  return (
    <>
      <View className="gap-2">
        <SectionHeader title={t('drawer.invitations')} />
        <ListGroup>
          {pendingInvitations.map((details, index) => (
            <View key={details.id}>
              {index > 0 ? <Separator className="mx-4" /> : null}
              <ListGroup.Item onPress={() => setSelectedInvitations([details])}>
                <ListGroup.ItemPrefix>
                  <SymbolView
                    name="envelope.fill"
                    size={20}
                    tintColor={foregroundColor}
                  />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{details.orgName}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {t('drawer.invitedBy', { name: details.inviterName })}
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
        invitations={selectedInvitations}
        onClose={() => setSelectedInvitations([])}
      />
    </>
  )
}
