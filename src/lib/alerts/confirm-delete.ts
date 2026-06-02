import {
  deleteGenerator,
  deleteMaintenanceRecord,
  deleteMaintenanceTemplate,
  deleteSession
} from '@/data/client/mutations'
import { t } from '@/lib/i18n'

import { confirmDestructive } from './confirm-destructive'

export function confirmDeleteSession(userId: string, sessionId: string) {
  confirmDestructive(
    t('generator.deleteRun'),
    t('generator.deleteRunConfirm'),
    { mutation: () => deleteSession(userId, sessionId) }
  )
}

export function confirmDeleteRecord(userId: string, recordId: string) {
  confirmDestructive(
    t('generator.deleteRecord'),
    t('generator.deleteRecordConfirm'),
    { mutation: () => deleteMaintenanceRecord(userId, recordId) }
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
    {
      mutation: () => deleteMaintenanceTemplate(userId, templateId),
      onSuccess: onDeleted
    }
  )
}

export function confirmDeleteGenerator(
  userId: string,
  generatorId: string,
  title: string,
  onDeleted?: () => void
) {
  confirmDestructive(
    t('generator.deleteGenerator'),
    t('generator.deleteGeneratorConfirm', { title }),
    {
      mutation: () => deleteGenerator(userId, generatorId),
      onSuccess: onDeleted
    }
  )
}
