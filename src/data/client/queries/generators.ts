import { and, desc, eq, isNull } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  type Generator,
  type GeneratorSession,
  type GeneratorUserAssignment
} from '../db-schema'
import { db, type ClientDb } from '@/lib/powersync/database'

// ── Builder form (for useDrizzleQuery) ──────────────────────────────────────

export function getGenerator(id: string) {
  return db.select().from(generators).where(eq(generators.id, id))
}

export function getGeneratorsByOrg(organizationId: string) {
  return db
    .select()
    .from(generators)
    .where(eq(generators.organizationId, organizationId))
}

export function getAllGeneratorSessions() {
  return db.select().from(generatorSessions)
}

export function getGeneratorSession(id: string) {
  return db.select().from(generatorSessions).where(eq(generatorSessions.id, id))
}

export function getGeneratorSessions(generatorId: string) {
  return db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.generatorId, generatorId))
    .orderBy(desc(generatorSessions.startedAt))
}

export function getAllGeneratorAssignments() {
  return db.select().from(generatorUserAssignments)
}

export function getGeneratorAssignments(generatorId: string) {
  return db
    .select()
    .from(generatorUserAssignments)
    .where(eq(generatorUserAssignments.generatorId, generatorId))
}

export function getUserAssignments(userId: string) {
  return db
    .select()
    .from(generatorUserAssignments)
    .where(eq(generatorUserAssignments.userId, userId))
}

// ── Row form (awaited, for mutations) ───────────────────────────────────────

export async function getGeneratorById(
  db: ClientDb,
  id: string
): Promise<Generator | null> {
  const [row] = await db
    .select()
    .from(generators)
    .where(eq(generators.id, id))
    .limit(1)
  return row ?? null
}

export async function getGeneratorSessionById(
  db: ClientDb,
  id: string
): Promise<GeneratorSession | null> {
  const [row] = await db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.id, id))
    .limit(1)
  return row ?? null
}

export async function getOpenSessionForGenerator(
  db: ClientDb,
  generatorId: string
): Promise<GeneratorSession | null> {
  const [row] = await db
    .select()
    .from(generatorSessions)
    .where(
      and(
        eq(generatorSessions.generatorId, generatorId),
        isNull(generatorSessions.stoppedAt)
      )
    )
    .limit(1)
  return row ?? null
}

export async function getGeneratorOrgId(
  db: ClientDb,
  generatorId: string
): Promise<string | null> {
  const [row] = await db
    .select({ organizationId: generators.organizationId })
    .from(generators)
    .where(eq(generators.id, generatorId))
    .limit(1)
  return row?.organizationId ?? null
}

export async function getAssignmentForUserAndGenerator(
  db: ClientDb,
  userId: string,
  generatorId: string
): Promise<GeneratorUserAssignment | null> {
  const [row] = await db
    .select()
    .from(generatorUserAssignments)
    .where(
      and(
        eq(generatorUserAssignments.generatorId, generatorId),
        eq(generatorUserAssignments.userId, userId)
      )
    )
    .limit(1)
  return row ?? null
}
