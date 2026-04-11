import type { PowerSyncDatabase } from '@powersync/react-native'

import { createClientAssignmentLifecycleChecks } from '@/data/client/assignments'
import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createClientGeneratorLifecycleChecks } from '@/data/client/generators'
import { createClientInvitationLifecycleChecks } from '@/data/client/invitations'
import { createClientMaintenanceLifecycleChecks } from '@/data/client/maintenance'
import { createClientMemberLifecycleChecks } from '@/data/client/members'
import { createClientOrganizationLifecycleChecks } from '@/data/client/organizations'
import { createClientSessionLifecycleChecks } from '@/data/client/sessions'
import type { AssignmentLifecycleChecks } from '@/data/shared/assignments'
import { createAuthzChecks } from '@/data/shared/authz'
import type { GeneratorLifecycleChecks } from '@/data/shared/generators'
import type { InvitationLifecycleChecks } from '@/data/shared/invitations'
import type { MaintenanceLifecycleChecks } from '@/data/shared/maintenance'
import type { MemberLifecycleChecks } from '@/data/shared/members'
import type { OrganizationLifecycleChecks } from '@/data/shared/organizations'
import type { SessionLifecycleChecks } from '@/data/shared/sessions'
import type { ClientDb } from '@/lib/powersync/database'

export interface ClientLifecycleChecks {
  readonly organizations: OrganizationLifecycleChecks
  readonly generators: GeneratorLifecycleChecks
  readonly invitations: InvitationLifecycleChecks
  readonly sessions: SessionLifecycleChecks
  readonly maintenance: MaintenanceLifecycleChecks
  readonly members: MemberLifecycleChecks
  readonly assignments: AssignmentLifecycleChecks
}

export interface MutationContext {
  readonly db: ClientDb
  readonly powersync: PowerSyncDatabase
  readonly checks: ClientLifecycleChecks
  readonly newId: () => string
  readonly now: () => Date
}

export function buildClientChecks(db: ClientDb): ClientLifecycleChecks {
  const authz = createAuthzChecks(createClientAuthzProvider(db))
  return {
    organizations: createClientOrganizationLifecycleChecks(db, authz),
    generators: createClientGeneratorLifecycleChecks(db, authz),
    invitations: createClientInvitationLifecycleChecks(db, authz),
    sessions: createClientSessionLifecycleChecks(db, authz),
    maintenance: createClientMaintenanceLifecycleChecks(db, authz),
    members: createClientMemberLifecycleChecks(db, authz),
    assignments: createClientAssignmentLifecycleChecks(db, authz)
  }
}
