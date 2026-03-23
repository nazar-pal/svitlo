import { Alert } from 'react-native'

import {
  deleteMaintenanceRecord,
  deleteMaintenanceTemplate,
  deleteSession
} from '@/data/client/mutations'
import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'

export function confirmDeleteSession(userId: string, sessionId: string) {
  Alert.alert(t('generator.deleteRun'), t('generator.deleteRunConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: async () => {
        const result = await deleteSession(userId, sessionId)
        if (!result.ok) return Alert.alert(t('common.error'), result.error)
        notifyWarning()
      }
    }
  ])
}

export function confirmDeleteRecord(userId: string, recordId: string) {
  Alert.alert(t('generator.deleteRecord'), t('generator.deleteRecordConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: async () => {
        const result = await deleteMaintenanceRecord(userId, recordId)
        if (!result.ok) return Alert.alert(t('common.error'), result.error)
        notifyWarning()
      }
    }
  ])
}

export function confirmDeleteTemplate(
  userId: string,
  templateId: string,
  onDeleted: () => void
) {
  Alert.alert(
    t('maintenanceTemplate.deleteTask'),
    t('maintenanceTemplate.deleteTaskConfirm'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const result = await deleteMaintenanceTemplate(userId, templateId)
          if (!result.ok) return Alert.alert(t('common.error'), result.error)
          notifyWarning()
          onDeleted()
        }
      }
    ]
  )
}
