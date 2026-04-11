import { getOrganizationById } from '@/data/client/queries'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'

// Client adapter: implements OrganizationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export const clientOrganizationFactsProvider: OrganizationFactsProvider = {
  async findOrganization(id) {
    const row = await getOrganizationById(id)
    if (!row) return null
    return { id: row.id, adminUserId: row.adminUserId }
  }
}
