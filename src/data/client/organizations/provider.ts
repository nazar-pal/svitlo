import { getOrganizationById } from '@/data/client/queries'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'
import { db as productionDb, type ClientDb } from '@/lib/powersync/database'

// Client adapter: implements OrganizationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export function createClientOrganizationFactsProvider(
  db: ClientDb
): OrganizationFactsProvider {
  return {
    async findOrganization(id) {
      const row = await getOrganizationById(db, id)
      if (!row) return null
      return { id: row.id, adminUserId: row.adminUserId }
    }
  }
}

// Singleton wrapper: accesses `productionDb` lazily inside each method so that
// jest.mock consumers (which replace `@/lib/powersync/database` with a getter
// whose backing is populated in `beforeAll`) don't fault at module load.
// Removed in a later commit once the per-domain lifecycle bundles switch to
// the factory directly.
export const clientOrganizationFactsProvider: OrganizationFactsProvider = {
  findOrganization: id =>
    createClientOrganizationFactsProvider(productionDb).findOrganization(id)
}
