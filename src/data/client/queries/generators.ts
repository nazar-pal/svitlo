import { desc, eq } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments
} from '../db-schema'
import { db } from '@/lib/powersync/database'

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

export function getGeneratorSessions(generatorId: string) {
  return db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.generatorId, generatorId))
    .orderBy(desc(generatorSessions.startedAt))
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
