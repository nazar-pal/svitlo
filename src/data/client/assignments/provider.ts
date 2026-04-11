import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrgMemberById
} from '@/data/client/queries'
import type { AssignmentFactsProvider } from '@/data/shared/assignments'
import { db } from '@/lib/powersync/database'

// Client adapter: implements AssignmentFactsProvider against PowerSync SQLite
// via the existing query helpers.
export const clientAssignmentFactsProvider: AssignmentFactsProvider = {
  async findGeneratorOrgId(generatorId) {
    return getGeneratorOrgId(db, generatorId)
  },

  async isOrgMember(userId, organizationId) {
    return (await getOrgMemberById(db, userId, organizationId)) !== null
  },

  async hasAssignment(userId, generatorId) {
    return (
      (await getAssignmentForUserAndGenerator(db, userId, generatorId)) !== null
    )
  }
}
