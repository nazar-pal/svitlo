import { handleGenerators } from './generators'
import { handleGeneratorSessions } from './sessions'
import { handleGeneratorUserAssignments } from './assignments'
import { handleInvitations } from './invitations'
import { handleMaintenanceRecords } from './maintenance-records'
import { handleMaintenanceTemplates } from './maintenance-templates'
import { handleOrganizationMembers } from './members'
import { handleOrganizations } from './organizations'
import { handleUser } from './user'
import type { TableHandler } from './types'

export type { WriteContext } from './types'

export const tableHandlers: Record<string, TableHandler> = {
  user: handleUser,
  organizations: handleOrganizations,
  organization_members: handleOrganizationMembers,
  invitations: handleInvitations,
  generators: handleGenerators,
  generator_user_assignments: handleGeneratorUserAssignments,
  generator_sessions: handleGeneratorSessions,
  maintenance_templates: handleMaintenanceTemplates,
  maintenance_records: handleMaintenanceRecords
}
