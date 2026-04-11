import {
  getGeneratorById,
  getGeneratorSessionById,
  getOpenSessionForGenerator
} from '@/data/client/queries'
import type { SessionFactsProvider } from '@/data/shared/sessions'
import { db } from '@/lib/powersync/database'

// Client adapter: implements SessionFactsProvider against PowerSync SQLite
// via the existing query helpers.
export const clientSessionFactsProvider: SessionFactsProvider = {
  async findSession(sessionId) {
    const row = await getGeneratorSessionById(db, sessionId)
    if (!row) return null
    return {
      generatorId: row.generatorId,
      startedByUserId: row.startedByUserId,
      isStopped: row.stoppedAt !== null
    }
  },

  async generatorExists(generatorId) {
    return (await getGeneratorById(db, generatorId)) !== null
  },

  async hasOpenSessionForGenerator(generatorId) {
    return (await getOpenSessionForGenerator(db, generatorId)) !== null
  }
}
