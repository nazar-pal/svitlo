import { and, eq, isNull } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import { generatorSessions, generators } from '@/data/server/db-schema'
import type { SessionFactsProvider } from '@/data/shared/sessions'

type Db = typeof serverDb

// Server adapter: implements SessionFactsProvider against Neon Postgres (or
// PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerSessionFactsProvider(db: Db): SessionFactsProvider {
  return {
    async findSession(sessionId) {
      const row = await db.query.generatorSessions.findFirst({
        where: eq(generatorSessions.id, sessionId),
        columns: {
          generatorId: true,
          startedByUserId: true,
          stoppedAt: true
        }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        startedByUserId: row.startedByUserId,
        isStopped: row.stoppedAt !== null
      }
    },

    async generatorExists(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { id: true }
      })
      return row !== undefined
    },

    async hasOpenSessionForGenerator(generatorId) {
      const row = await db.query.generatorSessions.findFirst({
        where: and(
          eq(generatorSessions.generatorId, generatorId),
          isNull(generatorSessions.stoppedAt)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}
