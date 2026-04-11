import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrgMemberById
} from '@/data/client/queries'
import type { AssignmentFactsProvider } from '@/data/shared/assignments'

// Client adapter: implements AssignmentFactsProvider against PowerSync SQLite
// via the existing query helpers.
export const clientAssignmentFactsProvider: AssignmentFactsProvider = {
  async findGeneratorOrgId(generatorId) {
    return getGeneratorOrgId(generatorId)
  },

  async isOrgMember(userId, organizationId) {
    return (await getOrgMemberById(userId, organizationId)) !== null
  },

  async hasAssignment(userId, generatorId) {
    return (
      (await getAssignmentForUserAndGenerator(userId, generatorId)) !== null
    )
  }
}
