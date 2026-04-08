import type Database from 'better-sqlite3'

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

export function seedBaseScenario(db: Database.Database) {
  db.exec(`
    INSERT INTO user VALUES ('${IDS.adminUser}', 'Admin', 'admin@test.com', 1, NULL, '${T}', '${T}');
    INSERT INTO user VALUES ('${IDS.memberUser}', 'Member', 'member@test.com', 1, NULL, '${T}', '${T}');
    INSERT INTO user VALUES ('${IDS.outsiderUser}', 'Outsider', 'outsider@test.com', 1, NULL, '${T}', '${T}');
    INSERT INTO organizations VALUES ('${IDS.org}', 'Test Org', '${IDS.adminUser}', '${T}');
    INSERT INTO organization_members VALUES ('${IDS.membership}', '${IDS.org}', '${IDS.memberUser}', '${T}');
  `)
}

export function seedGenerator(db: Database.Database) {
  db.exec(`
    INSERT INTO generators VALUES ('${IDS.generator}', '${IDS.org}', 'Honda EU2200i', 'EU2200i', NULL, 8, 4, 80, '${T}');
  `)
}

export function seedAssignment(db: Database.Database, userId = IDS.memberUser) {
  db.exec(`
    INSERT INTO generator_user_assignments VALUES ('${IDS.assignment}', '${IDS.generator}', '${userId}', '${T}');
  `)
}

export function seedActiveSession(db: Database.Database) {
  db.exec(`
    INSERT INTO generator_sessions VALUES ('${IDS.session.active}', '${IDS.generator}', '${IDS.adminUser}', NULL, '${T}', NULL);
  `)
}

export function seedStoppedSession(db: Database.Database) {
  db.exec(`
    INSERT INTO generator_sessions VALUES ('${IDS.session.stopped}', '${IDS.generator}', '${IDS.adminUser}', '${IDS.adminUser}', '2026-01-15T10:00:00Z', '2026-01-15T12:00:00Z');
  `)
}

export function seedInvitation(
  db: Database.Database,
  email = 'invitee@test.com'
) {
  db.exec(`
    INSERT INTO invitations VALUES ('${IDS.invitation}', '${IDS.org}', '${email}', '${IDS.adminUser}', '${T}');
  `)
}

export function seedMaintenanceTemplate(db: Database.Database) {
  db.exec(`
    INSERT INTO maintenance_templates VALUES ('${IDS.template}', '${IDS.generator}', 'Oil change', NULL, 'hours', 100, NULL, 0, '${T}');
  `)
}

export function seedMaintenanceRecord(db: Database.Database) {
  db.exec(`
    INSERT INTO maintenance_records VALUES ('${IDS.record}', '${IDS.template}', '${IDS.generator}', '${IDS.adminUser}', '${T}', NULL);
  `)
}
