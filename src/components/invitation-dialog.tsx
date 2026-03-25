import { Button, Dialog } from 'heroui-native'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import Animated, { Keyframe } from 'react-native-reanimated'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'

import {
  acceptInvitation,
  alertOnError,
  declineInvitation
} from '@/data/client/mutations'
import { getAllOrganizations, getAllUsers } from '@/data/client/queries'
import { notifySuccess, notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useTranslation } from '@/lib/i18n'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'

const slideInFromRight = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 50 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }] }
}).duration(250)

const slideOutToLeft = new Keyframe({
  0: { opacity: 1, transform: [{ translateX: 0 }] },
  100: { opacity: 0, transform: [{ translateX: -50 }] }
}).duration(200)

interface InvitationDialogProps {
  invitationIds: string[]
  onClose: () => void
}

export function InvitationDialog({
  invitationIds,
  onClose
}: InvitationDialogProps) {
  const { t } = useTranslation()
  const localUser = useLocalUser()
  const { userId } = useUserOrgs()
  const userEmail = localUser?.email ?? ''
  const [step, setStep] = useState(0)

  const pendingInvitations = usePendingInvitations()
  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())
  const { data: allUsers } = useDrizzleQuery(getAllUsers())

  const isOpen = invitationIds.length > 0
  const total = invitationIds.length
  const clampedStep = Math.min(step, Math.max(total - 1, 0))
  const currentId = invitationIds[clampedStep]

  // Cache resolved details so they survive the invitation being deleted after accept/decline
  const detailsCacheRef = useRef(
    new Map<string, { orgName: string; inviterName: string }>()
  )

  for (const id of invitationIds) {
    if (detailsCacheRef.current.has(id)) continue
    const inv = pendingInvitations.find(i => i.id === id)
    if (!inv) continue
    detailsCacheRef.current.set(id, {
      orgName:
        allOrgs.find(o => o.id === inv.organizationId)?.name ??
        t('common.unknown'),
      inviterName:
        allUsers.find(u => u.id === inv.invitedByUserId)?.name ??
        t('common.unknown')
    })
  }

  if (!isOpen) detailsCacheRef.current.clear()

  const details = currentId ? detailsCacheRef.current.get(currentId) : undefined
  const orgName = details?.orgName ?? t('common.unknown')
  const inviterName = details?.inviterName ?? t('common.unknown')

  function advance() {
    if (step + 1 < total) setStep(prev => prev + 1)
    else close()
  }

  function close() {
    setStep(0)
    onClose()
  }

  async function handleAccept() {
    if (!currentId) return
    const result = await acceptInvitation(userId, userEmail, currentId)
    if (alertOnError(result)) return
    advance()
    notifySuccess()
  }

  async function handleDecline() {
    if (!currentId) return
    const result = await declineInvitation(userEmail, currentId)
    if (alertOnError(result)) return
    advance()
    notifyWarning()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) close()
      }}
    >
      <Dialog.Portal>
        <BlurDialogOverlay />
        <Dialog.Content>
          <Dialog.Close variant="ghost" className="self-end" />
          <View className="overflow-hidden">
            <Animated.View
              key={currentId}
              entering={
                total > 1 && clampedStep > 0 ? slideInFromRight : undefined
              }
              exiting={total > 1 ? slideOutToLeft : undefined}
            >
              <View className="mb-5 gap-1.5">
                <Dialog.Title>{t('organization.orgInvitation')}</Dialog.Title>
                {details && (
                  <Dialog.Description>
                    {t('organization.invitedToJoin', {
                      inviter: inviterName,
                      org: orgName
                    })}
                  </Dialog.Description>
                )}
              </View>
              <View className="flex-row justify-end gap-3">
                <Button variant="ghost" size="sm" onPress={handleDecline}>
                  {t('organization.decline')}
                </Button>
                <Button variant="primary" size="sm" onPress={handleAccept}>
                  {t('organization.accept')}
                </Button>
              </View>
            </Animated.View>
          </View>
          {total > 1 && (
            <View className="mt-4 flex-row justify-center gap-1.5">
              {invitationIds.map((id, i) => (
                <View
                  key={id}
                  className={`size-1.5 rounded-full ${i === clampedStep ? 'bg-accent' : 'bg-muted/30'}`}
                />
              ))}
            </View>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
