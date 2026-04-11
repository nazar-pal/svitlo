import { getGeneratorById } from '@/data/client/queries'
import type { GeneratorFactsProvider } from '@/data/shared/generators'
import { db as productionDb, type ClientDb } from '@/lib/powersync/database'

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

// Singleton wrapper: see note in organizations/provider.ts.
export const clientGeneratorFactsProvider: GeneratorFactsProvider = {
  findGenerator: generatorId =>
    createClientGeneratorFactsProvider(productionDb).findGenerator(generatorId)
}
