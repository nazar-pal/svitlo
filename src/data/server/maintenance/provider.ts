import { eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import {
  generators,
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/server/db-schema'
import type { MaintenanceFactsProvider } from '@/data/shared/maintenance'

type Db = typeof serverDb

// Server adapter: implements MaintenanceFactsProvider against Neon Postgres
// (or PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerMaintenanceFactsProvider(
  db: Db
): MaintenanceFactsProvider {
  return {
    async generatorExists(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { id: true }
      })
      return row !== undefined
    },

    async findTemplate(templateId) {
      const row = await db.query.maintenanceTemplates.findFirst({
        where: eq(maintenanceTemplates.id, templateId),
        columns: {
          generatorId: true,
          triggerType: true,
          triggerHoursInterval: true,
          triggerCalendarDays: true
        }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        triggerType: row.triggerType,
        triggerHoursInterval: row.triggerHoursInterval,
        triggerCalendarDays: row.triggerCalendarDays
      }
    },

    async findRecord(recordId) {
      const row = await db.query.maintenanceRecords.findFirst({
        where: eq(maintenanceRecords.id, recordId),
        columns: { generatorId: true, performedByUserId: true }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        performedByUserId: row.performedByUserId
      }
    }
  }
}
