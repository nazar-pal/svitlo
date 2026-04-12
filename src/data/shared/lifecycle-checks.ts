import {
  createAssignmentLifecycleChecks,
  type AssignmentFactsProvider,
  type AssignmentLifecycleChecks
} from '@/data/shared/assignments'
import type { AuthzChecks } from '@/data/shared/authz'
import {
  createGeneratorLifecycleChecks,
  type GeneratorFactsProvider,
  type GeneratorLifecycleChecks
} from '@/data/shared/generators'
import {
  createInvitationLifecycleChecks,
  type InvitationFactsProvider,
  type InvitationLifecycleChecks
} from '@/data/shared/invitations'
import {
  createMaintenanceLifecycleChecks,
  type MaintenanceFactsProvider,
  type MaintenanceLifecycleChecks
} from '@/data/shared/maintenance'
import {
  createMemberLifecycleChecks,
  type MemberFactsProvider,
  type MemberLifecycleChecks
} from '@/data/shared/members'
import {
  createOrganizationLifecycleChecks,
  type OrganizationFactsProvider,
  type OrganizationLifecycleChecks
} from '@/data/shared/organizations'
import {
  createSessionLifecycleChecks,
  type SessionFactsProvider,
  type SessionLifecycleChecks
} from '@/data/shared/sessions'

export interface LifecycleChecks {
  readonly organizations: OrganizationLifecycleChecks
  readonly generators: GeneratorLifecycleChecks
  readonly invitations: InvitationLifecycleChecks
  readonly sessions: SessionLifecycleChecks
  readonly maintenance: MaintenanceLifecycleChecks
  readonly members: MemberLifecycleChecks
  readonly assignments: AssignmentLifecycleChecks
}

export interface FactsProviders<Db> {
  readonly organizations: (db: Db) => OrganizationFactsProvider
  readonly generators: (db: Db) => GeneratorFactsProvider
  readonly sessions: (db: Db) => SessionFactsProvider
  readonly assignments: (db: Db) => AssignmentFactsProvider
  readonly invitations: (db: Db) => InvitationFactsProvider
  readonly members: (db: Db) => MemberFactsProvider
  readonly maintenance: (db: Db) => MaintenanceFactsProvider
}

export function buildLifecycleChecks<Db>(
  db: Db,
  providers: FactsProviders<Db>,
  authz: AuthzChecks
): LifecycleChecks {
  return {
    organizations: createOrganizationLifecycleChecks(
      providers.organizations(db),
      authz
    ),
    generators: createGeneratorLifecycleChecks(providers.generators(db), authz),
    invitations: createInvitationLifecycleChecks(
      providers.invitations(db),
      authz
    ),
    sessions: createSessionLifecycleChecks(providers.sessions(db), authz),
    maintenance: createMaintenanceLifecycleChecks(
      providers.maintenance(db),
      authz
    ),
    members: createMemberLifecycleChecks(providers.members(db), authz),
    assignments: createAssignmentLifecycleChecks(
      providers.assignments(db),
      authz
    )
  }
}
