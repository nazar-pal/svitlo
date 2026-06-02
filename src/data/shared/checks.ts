import { runDecisionAsync } from '@/data/shared/facts/async-adapter'
import type { Decision } from '@/data/shared/facts/port'

import * as assignmentsD from './assignments/decisions'
import * as generatorsD from './generators/decisions'
import * as invitationsD from './invitations/decisions'
import * as maintenanceD from './maintenance/decisions'
import * as membersD from './members/decisions'
import * as organizationsD from './organizations/decisions'
import * as sessionsD from './sessions/decisions'

// Shared factory for the async check facade. Both the client
// (`@/data/client/mutations/context.ts`) and the server
// (`@/data/server/api/routers/powersync/handlers/checks.ts`) call this with
// their own side-specific `lookup` — the only thing that differs between
// sides is the resolver registry, not the decisions.
//
// `wrap` preserves each decision's `(args: Args) => Promise<CheckResult<Facts>>`
// signature via generic inference so mutation authors get precise argument
// + facts types without a hand-written interface. If TypeScript check time
// regresses, replace the return type with a hand-written `Checks` interface.

type RuleOk = { ok: true; [k: string]: unknown }
type RuleFail = { ok: false; code: string }
type Rule = RuleOk | RuleFail

function wrap<Args, Facts, R extends Rule>(
  decision: Decision<Args, Facts, R>,
  lookup: (key: string, input: unknown) => Promise<unknown>
) {
  return (args: Args) => runDecisionAsync(decision, args, lookup)
}

export function buildCheckFacade(
  lookup: (key: string, input: unknown) => Promise<unknown>
) {
  return {
    sessions: {
      startSession: wrap(sessionsD.startSession, lookup),
      stopSession: wrap(sessionsD.stopSession, lookup),
      deleteSession: wrap(sessionsD.deleteSession, lookup),
      updateSession: wrap(sessionsD.updateSession, lookup),
      logManualSession: wrap(sessionsD.logManualSession, lookup)
    },
    generators: {
      createGenerator: wrap(generatorsD.createGenerator, lookup),
      updateGenerator: wrap(generatorsD.updateGenerator, lookup),
      deleteGenerator: wrap(generatorsD.deleteGenerator, lookup)
    },
    assignments: {
      assignUserToGenerator: wrap(assignmentsD.assignUserToGenerator, lookup),
      unassignUserFromGenerator: wrap(
        assignmentsD.unassignUserFromGenerator,
        lookup
      )
    },
    organizations: {
      renameOrganization: wrap(organizationsD.renameOrganization, lookup),
      deleteOrganization: wrap(organizationsD.deleteOrganization, lookup)
    },
    invitations: {
      createInvitation: wrap(invitationsD.createInvitation, lookup),
      acceptInvitation: wrap(invitationsD.acceptInvitation, lookup),
      declineInvitation: wrap(invitationsD.declineInvitation, lookup),
      cancelInvitation: wrap(invitationsD.cancelInvitation, lookup)
    },
    maintenance: {
      createTemplate: wrap(maintenanceD.createTemplate, lookup),
      updateTemplate: wrap(maintenanceD.updateTemplate, lookup),
      deleteTemplate: wrap(maintenanceD.deleteTemplate, lookup),
      recordMaintenance: wrap(maintenanceD.recordMaintenance, lookup),
      deleteRecord: wrap(maintenanceD.deleteRecord, lookup),
      updateRecord: wrap(maintenanceD.updateRecord, lookup)
    },
    members: {
      removeMember: wrap(membersD.removeMember, lookup),
      leaveOrganization: wrap(membersD.leaveOrganization, lookup)
    }
  }
}

export type CheckFacade = ReturnType<typeof buildCheckFacade>
