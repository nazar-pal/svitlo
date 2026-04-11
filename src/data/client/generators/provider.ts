import { getGeneratorById } from '@/data/client/queries'
import type { GeneratorFactsProvider } from '@/data/shared/generators'
import type { ClientDb } from '@/lib/powersync/database'

// Client adapter: implements GeneratorFactsProvider against PowerSync SQLite
// via the existing query helpers.
export function createClientGeneratorFactsProvider(
  db: ClientDb
): GeneratorFactsProvider {
  return {
    async findGenerator(generatorId) {
      const row = await getGeneratorById(db, generatorId)
      if (!row) return null
      return { organizationId: row.organizationId }
    }
  }
}
