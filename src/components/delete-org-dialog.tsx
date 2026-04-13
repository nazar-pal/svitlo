import { useToast } from 'heroui-native'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { deleteOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { runMutation } from '@/lib/alerts'
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
        const ok = await runMutation(() => deleteOrganization(userId, orgId), {
          feedback: 'warning',
          onSuccess: () => {
            toast.show({
              variant: 'warning',
              label: t('organization.orgDeleted', { name: orgName })
            })
            onDeleted?.()
          }
        })
        if (!ok) throw new Error('delete-failed')
      }}
    />
  )
}
