import { desc, eq } from 'drizzle-orm'

import {
  maintenanceRecords,
  maintenanceTemplates,
  type MaintenanceRecord,
  type MaintenanceTemplate
} from '../db-schema'
import { db, type ClientDb } from '@/lib/powersync/database'

// ── Builder form (for useDrizzleQuery) ──────────────────────────────────────

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

// ── Row form (awaited, for mutations) ───────────────────────────────────────

export async function getMaintenanceTemplateById(
  db: ClientDb,
  id: string
): Promise<MaintenanceTemplate | null> {
  const [row] = await db
    .select()
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, id))
    .limit(1)
  return row ?? null
}

export async function getMaintenanceRecordById(
  db: ClientDb,
  id: string
): Promise<MaintenanceRecord | null> {
  const [row] = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, id))
    .limit(1)
  return row ?? null
}
