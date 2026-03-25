import { Button, Dialog, useToast } from 'heroui-native'
import { View } from 'react-native'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'

import { alertOnError, leaveOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useTranslation } from '@/lib/i18n'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface LeaveOrgDialogProps {
  orgId: string | null
  onClose: () => void
  onLeft?: () => void
}

export function LeaveOrgDialog({
  orgId,
  onClose,
  onLeft
}: LeaveOrgDialogProps) {
  const { t } = useTranslation()
  const { userId } = useUserOrgs()
  const { toast } = useToast()
  const { data: orgs } = useDrizzleQuery(
    orgId ? getOrganization(orgId) : undefined
  )
  const orgName = orgs[0]?.name ?? ''
  const isOpen = !!orgId

  async function handleLeave() {
    if (!orgId) return

    const result = await leaveOrganization(userId, orgId)
    if (alertOnError(result)) return

    notifyWarning()
    toast.show({
      variant: 'warning',
      label: t('organization.leftOrg', { name: orgName })
    })
    onClose()
    onLeft?.()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <BlurDialogOverlay />
        <Dialog.Content>
          <Dialog.Close variant="ghost" className="self-end" />
          <View className="gap-5">
            <View className="gap-1.5">
              <Dialog.Title>{t('organization.leaveOrg')}</Dialog.Title>
              <Dialog.Description>
                {t('organization.leaveOrgDesc', { name: orgName })}
              </Dialog.Description>
            </View>

            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" size="sm" onPress={onClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" size="sm" onPress={handleLeave}>
                {t('drawer.leave')}
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
