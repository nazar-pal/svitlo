import { getOrganizationById } from '@/data/client/queries'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'
import { db } from '@/lib/powersync/database'

// Client adapter: implements OrganizationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export const clientOrganizationFactsProvider: OrganizationFactsProvider = {
  async findOrganization(id) {
    const row = await getOrganizationById(db, id)
    if (!row) return null
    return { id: row.id, adminUserId: row.adminUserId }
  }
}
