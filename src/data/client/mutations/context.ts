import { createClientAssignmentFactsProvider } from '@/data/client/assignments/provider'
import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createClientGeneratorFactsProvider } from '@/data/client/generators/provider'
import { createClientInvitationFactsProvider } from '@/data/client/invitations/provider'
import { createClientMaintenanceFactsProvider } from '@/data/client/maintenance/provider'
import { createClientMemberFactsProvider } from '@/data/client/members/provider'
import { createClientOrganizationFactsProvider } from '@/data/client/organizations/provider'
import { createClientSessionFactsProvider } from '@/data/client/sessions/provider'
import {
  createAssignmentLifecycleChecks,
  type AssignmentLifecycleChecks
} from '@/data/shared/assignments'
import { createAuthzChecks } from '@/data/shared/authz'
import {
  createGeneratorLifecycleChecks,
  type GeneratorLifecycleChecks
} from '@/data/shared/generators'
import {
  createInvitationLifecycleChecks,
  type InvitationLifecycleChecks
} from '@/data/shared/invitations'
import {
  createMaintenanceLifecycleChecks,
  type MaintenanceLifecycleChecks
} from '@/data/shared/maintenance'
import {
  createMemberLifecycleChecks,
  type MemberLifecycleChecks
} from '@/data/shared/members'
import {
  createOrganizationLifecycleChecks,
  type OrganizationLifecycleChecks
} from '@/data/shared/organizations'
import {
  createSessionLifecycleChecks,
  type SessionLifecycleChecks
} from '@/data/shared/sessions'
import type { ClientDb } from '@/lib/powersync/database'

import type { WriteTx } from './tx'

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
  readonly checks: ClientLifecycleChecks
  readonly newId: () => string
  readonly now: () => Date
  readonly writeTx: WriteTx
}

export function buildClientChecks(db: ClientDb): ClientLifecycleChecks {
  const authz = createAuthzChecks(createClientAuthzProvider(db))
  return {
    organizations: createOrganizationLifecycleChecks(
      createClientOrganizationFactsProvider(db),
      authz
    ),
    generators: createGeneratorLifecycleChecks(
      createClientGeneratorFactsProvider(db),
      authz
    ),
    invitations: createInvitationLifecycleChecks(
      createClientInvitationFactsProvider(db),
      authz
    ),
    sessions: createSessionLifecycleChecks(
      createClientSessionFactsProvider(db),
      authz
    ),
    maintenance: createMaintenanceLifecycleChecks(
      createClientMaintenanceFactsProvider(db),
      authz
    ),
    members: createMemberLifecycleChecks(
      createClientMemberFactsProvider(db),
      authz
    ),
    assignments: createAssignmentLifecycleChecks(
      createClientAssignmentFactsProvider(db),
      authz
    )
  }
}
