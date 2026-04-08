import type { drizzle } from 'drizzle-orm/better-sqlite3'

import {
  generatorSessions,
  generatorUserAssignments,
  generators
} from '@/data/client/db-schema/generators'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema/maintenance'
import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema/organizations'
import { user } from '@/data/client/db-schema/user'

type Db = ReturnType<typeof drizzle>

export const IDS = {
  adminUser: 'user-admin',
  memberUser: 'user-member',
  outsiderUser: 'user-outsider',
  org: 'org-1',
  membership: 'member-1',
  generator: 'gen-1',
  assignment: 'assign-1',
  session: { active: 'session-active', stopped: 'session-stopped' },
  invitation: 'inv-1',
  template: 'tmpl-1',
  record: 'rec-1'
} as const

const T = '2026-01-15T12:00:00Z'

export function seedBaseScenario(db: Db) {
  db.insert(user)
    .values([
      {
        id: IDS.adminUser,
        name: 'Admin',
        email: 'admin@test.com',
        emailVerified: 1,
        createdAt: T,
        updatedAt: T
      },
      {
        id: IDS.memberUser,
        name: 'Member',
        email: 'member@test.com',
        emailVerified: 1,
        createdAt: T,
        updatedAt: T
      },
      {
        id: IDS.outsiderUser,
        name: 'Outsider',
        email: 'outsider@test.com',
        emailVerified: 1,
        createdAt: T,
        updatedAt: T
      }
    ])
    .run()

  db.insert(organizations)
    .values({
      id: IDS.org,
      name: 'Test Org',
      adminUserId: IDS.adminUser,
      createdAt: T
    })
    .run()

  db.insert(organizationMembers)
    .values({
      id: IDS.membership,
      organizationId: IDS.org,
      userId: IDS.memberUser,
      joinedAt: T
    })
    .run()
}

export function seedGenerator(db: Db) {
  db.insert(generators)
    .values({
      id: IDS.generator,
      organizationId: IDS.org,
      title: 'Honda EU2200i',
      model: 'EU2200i',
      maxConsecutiveRunHours: 8,
      requiredRestHours: 4,
      runWarningThresholdPct: 80,
      createdAt: T
    })
    .run()
}

export function seedAssignment(db: Db, userId = IDS.memberUser) {
  db.insert(generatorUserAssignments)
    .values({
      id: IDS.assignment,
      generatorId: IDS.generator,
      userId,
      assignedAt: T
    })
    .run()
}

export function seedActiveSession(db: Db) {
  db.insert(generatorSessions)
    .values({
      id: IDS.session.active,
      generatorId: IDS.generator,
      startedByUserId: IDS.adminUser,
      startedAt: T
    })
    .run()
}

export function seedStoppedSession(db: Db) {
  db.insert(generatorSessions)
    .values({
      id: IDS.session.stopped,
      generatorId: IDS.generator,
      startedByUserId: IDS.adminUser,
      stoppedByUserId: IDS.adminUser,
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    .run()
}

export function seedInvitation(db: Db, email = 'invitee@test.com') {
  db.insert(invitations)
    .values({
      id: IDS.invitation,
      organizationId: IDS.org,
      inviteeEmail: email,
      invitedByUserId: IDS.adminUser,
      createdAt: T
    })
    .run()
}

export function seedMaintenanceTemplate(db: Db) {
  db.insert(maintenanceTemplates)
    .values({
      id: IDS.template,
      generatorId: IDS.generator,
      taskName: 'Oil change',
      triggerType: 'hours',
      triggerHoursInterval: 100,
      isOneTime: 0,
      createdAt: T
    })
    .run()
}

export function seedMaintenanceRecord(db: Db) {
  db.insert(maintenanceRecords)
    .values({
      id: IDS.record,
      templateId: IDS.template,
      generatorId: IDS.generator,
      performedByUserId: IDS.adminUser,
      performedAt: T
    })
    .run()
}
