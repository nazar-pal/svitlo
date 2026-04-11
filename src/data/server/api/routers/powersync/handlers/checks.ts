import { createServerAssignmentFactsProvider } from '@/data/server/assignments/provider'
import { createServerAuthz } from '@/data/server/authz'
import { createServerGeneratorFactsProvider } from '@/data/server/generators/provider'
import { createServerInvitationFactsProvider } from '@/data/server/invitations/provider'
import { createServerMaintenanceFactsProvider } from '@/data/server/maintenance/provider'
import { createServerMemberFactsProvider } from '@/data/server/members/provider'
import { createServerOrganizationFactsProvider } from '@/data/server/organizations/provider'
import { createServerSessionFactsProvider } from '@/data/server/sessions/provider'
import {
  createAssignmentLifecycleChecks,
  type AssignmentLifecycleChecks
} from '@/data/shared/assignments'
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

import type { Db } from './types'

export interface ServerLifecycleChecks {
  readonly organizations: OrganizationLifecycleChecks
  readonly generators: GeneratorLifecycleChecks
  readonly invitations: InvitationLifecycleChecks
  readonly sessions: SessionLifecycleChecks
  readonly maintenance: MaintenanceLifecycleChecks
  readonly members: MemberLifecycleChecks
  readonly assignments: AssignmentLifecycleChecks
}

export function buildServerChecks(db: Db): ServerLifecycleChecks {
  const authz = createServerAuthz(db)
  return {
    organizations: createOrganizationLifecycleChecks(
      createServerOrganizationFactsProvider(db),
      authz
    ),
    generators: createGeneratorLifecycleChecks(
      createServerGeneratorFactsProvider(db),
      authz
    ),
    invitations: createInvitationLifecycleChecks(
      createServerInvitationFactsProvider(db),
      authz
    ),
    sessions: createSessionLifecycleChecks(
      createServerSessionFactsProvider(db),
      authz
    ),
    maintenance: createMaintenanceLifecycleChecks(
      createServerMaintenanceFactsProvider(db),
      authz
    ),
    members: createMemberLifecycleChecks(
      createServerMemberFactsProvider(db),
      authz
    ),
    assignments: createAssignmentLifecycleChecks(
      createServerAssignmentFactsProvider(db),
      authz
    )
  }
}
