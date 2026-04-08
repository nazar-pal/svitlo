import { sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/pglite'
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

const T = '2026-01-15T12:00:00Z'

export async function seedUsers(db: Db) {
  await db.execute(sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES
      (${IDS.admin}, 'Admin', 'admin@test.com', true, ${T}, ${T}),
      (${IDS.member}, 'Member', 'member@test.com', true, ${T}, ${T}),
      (${IDS.outsider}, 'Outsider', 'outsider@test.com', true, ${T}, ${T})
  `)
}

export async function seedOrg(db: Db) {
  await db.execute(sql`
    INSERT INTO organizations (id, name, admin_user_id, created_at)
    VALUES (${IDS.org}, 'Test Org', ${IDS.admin}, ${T})
  `)
}

export async function seedMembership(db: Db) {
  await db.execute(sql`
    INSERT INTO organization_members (id, organization_id, user_id, joined_at)
    VALUES (${IDS.membership}, ${IDS.org}, ${IDS.member}, ${T})
  `)
}

export async function seedGenerator(db: Db) {
  await db.execute(sql`
    INSERT INTO generators (id, organization_id, title, model, max_consecutive_run_hours, required_rest_hours, run_warning_threshold_pct, created_at)
    VALUES (${IDS.generator}, ${IDS.org}, 'Honda EU2200i', 'EU2200i', 8, 4, 80, ${T})
  `)
}

export async function seedAssignment(db: Db, userId: string = IDS.member) {
  await db.execute(sql`
    INSERT INTO generator_user_assignments (id, generator_id, user_id, assigned_at)
    VALUES (${IDS.assignment}, ${IDS.generator}, ${userId}, ${T})
  `)
}

export async function seedInvitation(db: Db, email = 'invitee@test.com') {
  await db.execute(sql`
    INSERT INTO invitations (id, organization_id, invitee_email, invited_by_user_id, created_at)
    VALUES (${IDS.invitation}, ${IDS.org}, ${email}, ${IDS.admin}, ${T})
  `)
}

export async function seedSession(db: Db, startedBy: string = IDS.admin) {
  await db.execute(sql`
    INSERT INTO generator_sessions (id, generator_id, started_by_user_id, started_at)
    VALUES (${IDS.session}, ${IDS.generator}, ${startedBy}, ${T})
  `)
}

export async function seedTemplate(db: Db) {
  await db.execute(sql`
    INSERT INTO maintenance_templates (id, generator_id, task_name, trigger_type, trigger_hours_interval, is_one_time, created_at)
    VALUES (${IDS.template}, ${IDS.generator}, 'Oil change', 'hours', 100, false, ${T})
  `)
}

export async function seedRecord(db: Db, performedBy: string = IDS.admin) {
  await db.execute(sql`
    INSERT INTO maintenance_records (id, template_id, generator_id, performed_by_user_id, performed_at)
    VALUES (${IDS.record}, ${IDS.template}, ${IDS.generator}, ${performedBy}, ${T})
  `)
}

/** Seed the standard scenario: users + org + membership + generator */
export async function seedBaseScenario(db: Db) {
  await seedUsers(db)
  await seedOrg(db)
  await seedMembership(db)
  await seedGenerator(db)
}
