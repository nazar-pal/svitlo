import { and, eq, isNull } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  invitations,
  maintenanceRecords,
  maintenanceTemplates,
  organizationMembers,
  organizations
} from '@/data/server/db-schema'
import type { AssignmentFactsProvider } from '@/data/shared/assignments'
import type { GeneratorFactsProvider } from '@/data/shared/generators'
import type { InvitationFactsProvider } from '@/data/shared/invitations'
import type { MaintenanceFactsProvider } from '@/data/shared/maintenance'
import type { MemberFactsProvider } from '@/data/shared/members'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'
import type { SessionFactsProvider } from '@/data/shared/sessions'

type Db = typeof serverDb

export function createServerOrganizationFactsProvider(
  db: Db
): OrganizationFactsProvider {
  return {
    async findOrganization(id) {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, id),
        columns: { id: true, adminUserId: true }
      })
      if (!row) return null
      return { id: row.id, adminUserId: row.adminUserId }
    }
  }
}

export function createServerGeneratorFactsProvider(
  db: Db
): GeneratorFactsProvider {
  return {
    async findGenerator(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { organizationId: true }
      })
      if (!row) return null
      return { organizationId: row.organizationId }
    }
  }
}

export function createServerSessionFactsProvider(db: Db): SessionFactsProvider {
  return {
    async findSession(sessionId) {
      const row = await db.query.generatorSessions.findFirst({
        where: eq(generatorSessions.id, sessionId),
        columns: {
          generatorId: true,
          startedByUserId: true,
          stoppedAt: true
        }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        startedByUserId: row.startedByUserId,
        isStopped: row.stoppedAt !== null
      }
    },

    async generatorExists(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { id: true }
      })
      return row !== undefined
    },

    async hasOpenSessionForGenerator(generatorId) {
      const row = await db.query.generatorSessions.findFirst({
        where: and(
          eq(generatorSessions.generatorId, generatorId),
          isNull(generatorSessions.stoppedAt)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}

export function createServerAssignmentFactsProvider(
  db: Db
): AssignmentFactsProvider {
  return {
    async findGeneratorOrgId(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { organizationId: true }
      })
      return row?.organizationId ?? null
    },

    async isOrgMember(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    },

    async hasAssignment(userId, generatorId) {
      const row = await db.query.generatorUserAssignments.findFirst({
        where: and(
          eq(generatorUserAssignments.generatorId, generatorId),
          eq(generatorUserAssignments.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}

export function createServerInvitationFactsProvider(
  db: Db
): InvitationFactsProvider {
  return {
    async findInvitationById(invitationId) {
      const row = await db.query.invitations.findFirst({
        where: eq(invitations.id, invitationId),
        columns: { organizationId: true, inviteeEmail: true }
      })
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async findInvitationByOrgAndEmail(organizationId, inviteeEmail) {
      const row = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.inviteeEmail, inviteeEmail)
        ),
        columns: { organizationId: true, inviteeEmail: true }
      })
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async hasMembership(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}

export function createServerMemberFactsProvider(db: Db): MemberFactsProvider {
  return {
    async findMembershipById(memberId) {
      const row = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.id, memberId),
        columns: { id: true, organizationId: true, userId: true }
      })
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findMembershipByUserAndOrg(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true, organizationId: true, userId: true }
      })
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findOrgAdmin(organizationId) {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
        columns: { adminUserId: true }
      })
      if (!row) return null
      return { adminUserId: row.adminUserId }
    }
  }
}

export function createServerMaintenanceFactsProvider(
  db: Db
): MaintenanceFactsProvider {
  return {
    async generatorExists(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { id: true }
      })
      return row !== undefined
    },

    async findTemplate(templateId) {
      const row = await db.query.maintenanceTemplates.findFirst({
        where: eq(maintenanceTemplates.id, templateId),
        columns: {
          generatorId: true,
          triggerType: true,
          triggerHoursInterval: true,
          triggerCalendarDays: true
        }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        triggerType: row.triggerType,
        triggerHoursInterval: row.triggerHoursInterval,
        triggerCalendarDays: row.triggerCalendarDays
      }
    },

    async findRecord(recordId) {
      const row = await db.query.maintenanceRecords.findFirst({
        where: eq(maintenanceRecords.id, recordId),
        columns: { generatorId: true, performedByUserId: true }
      })
      if (!row) return null
      return {
        generatorId: row.generatorId,
        performedByUserId: row.performedByUserId
      }
    }
  }
}
