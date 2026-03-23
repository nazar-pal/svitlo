import { useToast } from 'heroui-native'
import { Alert } from 'react-native'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { deleteOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useTranslation } from '@/lib/i18n'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface DeleteOrgDialogProps {
  orgId: string | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteOrgDialog({
  orgId,
  onClose,
  onDeleted
}: DeleteOrgDialogProps) {
  const { t } = useTranslation()
  const { userId } = useUserOrgs()
  const { toast } = useToast()
  const { data: orgs } = useDrizzleQuery(
    orgId ? getOrganization(orgId) : undefined
  )
  const orgName = orgs[0]?.name ?? ''

  return (
    <ConfirmDeleteDialog
      isOpen={!!orgId}
      onClose={onClose}
      title={t('organization.deleteOrg')}
      description={t('organization.deleteOrgDesc')}
      label={t('organization.typeToConfirm', { name: orgName })}
      placeholder={orgName}
      errorMessage={t('organization.nameDoesNotMatch')}
      deleteLabel={t('common.delete')}
      isMatch={text => text === orgName && orgName.length > 0}
      onDelete={async () => {
        if (!orgId) return

        const result = await deleteOrganization(userId, orgId)
        if (!result.ok) {
          Alert.alert(t('common.error'), result.error)
          throw new Error(result.error)
        }

        notifyWarning()
        toast.show({
          variant: 'warning',
          label: t('organization.orgDeleted', { name: orgName })
        })
        onDeleted?.()
      }}
    />
  )
}
