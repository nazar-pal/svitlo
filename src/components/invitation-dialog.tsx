import { Button, Dialog } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { Keyframe } from 'react-native-reanimated'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'

import { acceptInvitation, declineInvitation } from '@/data/client/mutations'
import { alertOnError } from '@/lib/alerts'
import { notifySuccess, notifyWarning } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
import type { InvitationDetails } from '@/lib/hooks/use-pending-invitations'
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
  invitations: InvitationDetails[]
  onClose: () => void
}

export function InvitationDialog({
  invitations,
  onClose
}: InvitationDialogProps) {
  const { t } = useTranslation()
  const localUser = useLocalUser()
  const { userId } = useUserOrgs()
  const userEmail = localUser?.email ?? ''
  const [step, setStep] = useState(0)

  const isOpen = invitations.length > 0
  const total = invitations.length
  const clampedStep = Math.min(step, Math.max(total - 1, 0))
  const current = invitations[clampedStep]

  function advance() {
    if (step + 1 < total) setStep(prev => prev + 1)
    else close()
  }

  function close() {
    setStep(0)
    onClose()
  }

  async function handleAccept() {
    if (!current) return
    const result = await acceptInvitation(userId, userEmail, current.id)
    if (alertOnError(result)) return
    advance()
    notifySuccess()
  }

  async function handleDecline() {
    if (!current) return
    const result = await declineInvitation(userEmail, current.id)
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
              key={current?.id}
              entering={
                total > 1 && clampedStep > 0 ? slideInFromRight : undefined
              }
              exiting={total > 1 ? slideOutToLeft : undefined}
            >
              <View className="mb-5 gap-1.5">
                <Dialog.Title>{t('organization.orgInvitation')}</Dialog.Title>
                {current && (
                  <Dialog.Description>
                    {t('organization.invitedToJoin', {
                      inviter: current.inviterName,
                      org: current.orgName
                    })}
                  </Dialog.Description>
                )}
              </View>
              <View className="flex-row justify-end gap-3">
                <Button
                  testID="invitation-decline"
                  variant="ghost"
                  size="sm"
                  onPress={handleDecline}
                >
                  {t('organization.decline')}
                </Button>
                <Button
                  testID="invitation-accept"
                  variant="primary"
                  size="sm"
                  onPress={handleAccept}
                >
                  {t('organization.accept')}
                </Button>
              </View>
            </Animated.View>
          </View>
          {total > 1 && (
            <View className="mt-4 flex-row justify-center gap-1.5">
              {invitations.map((inv, i) => (
                <View
                  key={inv.id}
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
