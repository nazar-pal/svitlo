import { getGeneratorById } from '@/data/client/queries'
import {
  getMaintenanceRecordById,
  getMaintenanceTemplateById
} from '@/data/client/queries/maintenance'
import type { MaintenanceFactsProvider } from '@/data/shared/maintenance'
import type { ClientDb } from '@/lib/powersync/database'

// Client adapter: implements MaintenanceFactsProvider against PowerSync
// SQLite via the existing query helpers.
export function createClientMaintenanceFactsProvider(
  db: ClientDb
): MaintenanceFactsProvider {
  return {
    async generatorExists(generatorId) {
      return (await getGeneratorById(db, generatorId)) !== null
    },

    async findTemplate(templateId) {
      const row = await getMaintenanceTemplateById(db, templateId)
      if (!row) return null
      return {
        generatorId: row.generatorId,
        triggerType: row.triggerType,
        triggerHoursInterval: row.triggerHoursInterval,
        triggerCalendarDays: row.triggerCalendarDays
      }
    },

    async findRecord(recordId) {
      const row = await getMaintenanceRecordById(db, recordId)
      if (!row) return null
      return {
        generatorId: row.generatorId,
        performedByUserId: row.performedByUserId
      }
    }
  }
}
