import {
  getAssignmentForUserAndGenerator,
  getGeneratorById,
  getGeneratorOrgId,
  getGeneratorSessionById,
  getInvitationById,
  getInvitationByOrgAndEmail,
  getOpenSessionForGenerator,
  getOrganizationAdminUserId,
  getOrganizationById,
  getOrgMemberById,
  getOrgMembershipById
} from '@/data/client/queries'
import {
  getMaintenanceRecordById,
  getMaintenanceTemplateById
} from '@/data/client/queries/maintenance'
import type { AssignmentFactsProvider } from '@/data/shared/assignments'
import type { GeneratorFactsProvider } from '@/data/shared/generators'
import type { InvitationFactsProvider } from '@/data/shared/invitations'
import type { MaintenanceFactsProvider } from '@/data/shared/maintenance'
import type { MemberFactsProvider } from '@/data/shared/members'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'
import type { SessionFactsProvider } from '@/data/shared/sessions'
import type { ClientDb } from '@/lib/powersync/database'

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

export function createClientSessionFactsProvider(
  db: ClientDb
): SessionFactsProvider {
  return {
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
}

export function createClientAssignmentFactsProvider(
  db: ClientDb
): AssignmentFactsProvider {
  return {
    async findGeneratorOrgId(generatorId) {
      return getGeneratorOrgId(db, generatorId)
    },

    async isOrgMember(userId, organizationId) {
      return (await getOrgMemberById(db, userId, organizationId)) !== null
    },

    async hasAssignment(userId, generatorId) {
      return (
        (await getAssignmentForUserAndGenerator(db, userId, generatorId)) !==
        null
      )
    }
  }
}

export function createClientInvitationFactsProvider(
  db: ClientDb
): InvitationFactsProvider {
  return {
    async findInvitationById(invitationId) {
      const row = await getInvitationById(db, invitationId)
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async findInvitationByOrgAndEmail(organizationId, inviteeEmail) {
      const row = await getInvitationByOrgAndEmail(
        db,
        organizationId,
        inviteeEmail
      )
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async hasMembership(userId, organizationId) {
      return (await getOrgMemberById(db, userId, organizationId)) !== null
    }
  }
}

export function createClientMemberFactsProvider(
  db: ClientDb
): MemberFactsProvider {
  return {
    async findMembershipById(memberId) {
      const row = await getOrgMembershipById(db, memberId)
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findMembershipByUserAndOrg(userId, organizationId) {
      const row = await getOrgMemberById(db, userId, organizationId)
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findOrgAdmin(organizationId) {
      const adminUserId = await getOrganizationAdminUserId(db, organizationId)
      if (!adminUserId) return null
      return { adminUserId }
    }
  }
}

export function createClientMaintenanceFactsProvider(
  db: ClientDb
): MaintenanceFactsProvider {
  return {
    async generatorExists(generatorId) {
      return (await getGeneratorById(db, generatorId)) !== null
    },

    async findTemplate(templateId) {
      const row = await getMaintenanceTemplateById(db, templateId)
      if (!row) return null
      return {
        generatorId: row.generatorId,
        triggerType: row.triggerType,
        triggerHoursInterval: row.triggerHoursInterval,
        triggerCalendarDays: row.triggerCalendarDays
      }
    },

    async findRecord(recordId) {
      const row = await getMaintenanceRecordById(db, recordId)
      if (!row) return null
      return {
        generatorId: row.generatorId,
        performedByUserId: row.performedByUserId
      }
    }
  }
}
