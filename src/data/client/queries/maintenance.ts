import { desc, eq } from 'drizzle-orm'

import { maintenanceRecords, maintenanceTemplates } from '../db-schema'
import { db } from '@/lib/powersync/database'

// Reactive Drizzle builders for `useDrizzleQuery` subscriptions. Row-form
// awaited queries for the mutation path live in the fact registry
// (`@/data/client/registry.ts`) so async + reactive share one source of
// SQL per fact.

export function getMaintenanceTemplate(id: string) {
  return db
    .select()
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, id))
}

export function getMaintenanceTemplates(generatorId: string) {
  return db
    .select()
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.generatorId, generatorId))
}

export function getMaintenanceTemplateSummaries(generatorId: string) {
  return db
    .select({
      id: maintenanceTemplates.id,
      taskName: maintenanceTemplates.taskName
    })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.generatorId, generatorId))
}

export function getAllMaintenanceTemplates() {
  return db.select().from(maintenanceTemplates)
}

export function getMaintenanceRecords(generatorId: string) {
  return db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.generatorId, generatorId))
    .orderBy(desc(maintenanceRecords.performedAt))
}

export function getMaintenanceRecord(id: string) {
  return db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, id))
}

export function getAllMaintenanceRecords() {
  return db.select().from(maintenanceRecords)
}
