import { Alert } from 'react-native'

import {
  deleteMaintenanceRecord,
  deleteMaintenanceTemplate,
  deleteSession
} from '@/data/client/mutations'
import type { MutationResult } from '@/data/shared/result'
import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'

import { alertOnError } from './alert-on-error'

function confirmDestructive(
  title: string,
  message: string,
  mutation: () => Promise<MutationResult>,
  onSuccess?: () => void
) {
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: async () => {
        const result = await mutation()
        if (alertOnError(result)) return
        notifyWarning()
        onSuccess?.()
      }
    }
  ])
}

export function confirmDeleteSession(userId: string, sessionId: string) {
  confirmDestructive(
    t('generator.deleteRun'),
    t('generator.deleteRunConfirm'),
    () => deleteSession(userId, sessionId)
  )
}

export function confirmDeleteRecord(userId: string, recordId: string) {
  confirmDestructive(
    t('generator.deleteRecord'),
    t('generator.deleteRecordConfirm'),
    () => deleteMaintenanceRecord(userId, recordId)
  )
}

export function confirmDeleteTemplate(
  userId: string,
  templateId: string,
  onDeleted: () => void
) {
  confirmDestructive(
    t('maintenanceTemplate.deleteTask'),
    t('maintenanceTemplate.deleteTaskConfirm'),
    () => deleteMaintenanceTemplate(userId, templateId),
    onDeleted
  )
}
