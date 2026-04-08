import type { drizzle } from 'drizzle-orm/pglite'

import {
  generatorSessions,
  generatorUserAssignments,
  generators
} from '@/data/server/db-schema/generators'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/server/db-schema/maintenance'
import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/server/db-schema/organizations'
import { user } from '@/data/server/db-schema/auth'
import type * as schema from '@/data/server/db-schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

export const IDS = {
  admin: 'user-admin',
  member: 'user-member',
  outsider: 'user-outsider',
  org: '00000000-0000-0000-0000-000000000001',
  generator: '00000000-0000-0000-0000-000000000002',
  assignment: '00000000-0000-0000-0000-000000000003',
  session: '00000000-0000-0000-0000-000000000004',
  invitation: '00000000-0000-0000-0000-000000000005',
  membership: '00000000-0000-0000-0000-000000000006',
  template: '00000000-0000-0000-0000-000000000007',
  record: '00000000-0000-0000-0000-000000000008'
} as const

const T = new Date('2026-01-15T12:00:00Z')

export async function seedUsers(db: Db) {
  await db.insert(user).values([
    {
      id: IDS.admin,
      name: 'Admin',
      email: 'admin@test.com',
      emailVerified: true,
      createdAt: T,
      updatedAt: T
    },
    {
      id: IDS.member,
      name: 'Member',
      email: 'member@test.com',
      emailVerified: true,
      createdAt: T,
      updatedAt: T
    },
    {
      id: IDS.outsider,
      name: 'Outsider',
      email: 'outsider@test.com',
      emailVerified: true,
      createdAt: T,
      updatedAt: T
    }
  ])
}

export async function seedOrg(db: Db) {
  await db.insert(organizations).values({
    id: IDS.org,
    name: 'Test Org',
    adminUserId: IDS.admin,
    createdAt: T
  })
}

export async function seedMembership(db: Db) {
  await db.insert(organizationMembers).values({
    id: IDS.membership,
    organizationId: IDS.org,
    userId: IDS.member,
    joinedAt: T
  })
}

export async function seedGenerator(db: Db) {
  await db.insert(generators).values({
    id: IDS.generator,
    organizationId: IDS.org,
    title: 'Honda EU2200i',
    model: 'EU2200i',
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    runWarningThresholdPct: 80,
    createdAt: T
  })
}

export async function seedAssignment(db: Db, userId: string = IDS.member) {
  await db.insert(generatorUserAssignments).values({
    id: IDS.assignment,
    generatorId: IDS.generator,
    userId,
    assignedAt: T
  })
}

export async function seedInvitation(db: Db, email = 'invitee@test.com') {
  await db.insert(invitations).values({
    id: IDS.invitation,
    organizationId: IDS.org,
    inviteeEmail: email,
    invitedByUserId: IDS.admin,
    createdAt: T
  })
}

export async function seedSession(db: Db, startedBy: string = IDS.admin) {
  await db.insert(generatorSessions).values({
    id: IDS.session,
    generatorId: IDS.generator,
    startedByUserId: startedBy,
    startedAt: T
  })
}

export async function seedTemplate(db: Db) {
  await db.insert(maintenanceTemplates).values({
    id: IDS.template,
    generatorId: IDS.generator,
    taskName: 'Oil change',
    triggerType: 'hours',
    triggerHoursInterval: 100,
    isOneTime: false,
    createdAt: T
  })
}

export async function seedRecord(db: Db, performedBy: string = IDS.admin) {
  await db.insert(maintenanceRecords).values({
    id: IDS.record,
    templateId: IDS.template,
    generatorId: IDS.generator,
    performedByUserId: performedBy,
    performedAt: T
  })
}

/** Seed the standard scenario: users + org + membership + generator */
export async function seedBaseScenario(db: Db) {
  await seedUsers(db)
  await seedOrg(db)
  await seedMembership(db)
  await seedGenerator(db)
}
