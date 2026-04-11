import { randomUUID } from 'expo-crypto'

import { db } from '@/lib/powersync/database'

import { buildClientChecks, type MutationContext } from './context'
import { createPowerSyncWriteTx } from './tx'
import { createAssignmentMutations } from './assignments'
import { createGeneratorMutations } from './generators'
import { createInvitationMutations } from './invitations'
import { createMaintenanceMutations } from './maintenance'
import { createMemberMutations } from './members'
import { createOrganizationMutations } from './organizations'
import { createSessionMutations } from './sessions'

const defaultMutationContext: MutationContext = {
  db,
  checks: buildClientChecks(db),
  newId: () => randomUUID(),
  now: () => new Date(),
  writeTx: createPowerSyncWriteTx(db)
}

const organizations = createOrganizationMutations(defaultMutationContext)
const generators = createGeneratorMutations(defaultMutationContext)
const invitations = createInvitationMutations(defaultMutationContext)
const sessions = createSessionMutations(defaultMutationContext)
const maintenance = createMaintenanceMutations(defaultMutationContext)
const members = createMemberMutations(defaultMutationContext)
const assignments = createAssignmentMutations(defaultMutationContext)

export const { createOrganization, renameOrganization, deleteOrganization } =
  organizations
export const {
  createGeneratorWithMaintenance,
  updateGenerator,
  deleteGenerator
} = generators
export const {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
} = invitations
export const {
  startSession,
  stopSession,
  updateSession,
  deleteSession,
  logManualSession
} = sessions
export const {
  createMaintenanceTemplate,
  updateMaintenanceTemplate,
  deleteMaintenanceTemplate,
  recordMaintenance,
  updateMaintenanceRecord,
  deleteMaintenanceRecord
} = maintenance
export const { removeMember, leaveOrganization } = members
export const { assignUserToGenerator, unassignUserFromGenerator } = assignments

export { type MutationResult } from '@/data/shared/result'
