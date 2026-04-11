import { getGeneratorById } from '@/data/client/queries'
import type { GeneratorFactsProvider } from '@/data/shared/generators'
import { db } from '@/lib/powersync/database'

// Client adapter: implements GeneratorFactsProvider against PowerSync SQLite
// via the existing query helpers.
export const clientGeneratorFactsProvider: GeneratorFactsProvider = {
  async findGenerator(generatorId) {
    const row = await getGeneratorById(db, generatorId)
    if (!row) return null
    return { organizationId: row.organizationId }
  }
}
