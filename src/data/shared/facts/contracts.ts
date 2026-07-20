import type {
  GeneratorAuthzFact,
  OrgAuthzFact
} from '@/data/shared/authz/policy'
import type { InvitationRef } from '@/data/shared/invitations'
import type {
  RecordRef,
  TemplateRef as TemplateTriggerRef
} from '@/data/shared/maintenance'
import type { MemberRef as OrgMembershipRef } from '@/data/shared/members'
import type { OrganizationRef } from '@/data/shared/organizations'
import type { SessionRef } from '@/data/shared/sessions'

// One contract per fact key: the input a decision plan supplies and the fact
// shape a resolver must produce. Both side-specific registries are
// `satisfies`-checked against this map, so a typo'd key in a plan, a
// resolver missing on either side, or an input/fact shape drifting between
// the SQLite and Postgres implementations is a compile error instead of a
// runtime throw.

export interface GeneratorUserInput {
  userId: string
  generatorId: string
}

export interface OrgMemberInput {
  userId: string
  organizationId: string
}

// Re-exported under the names the registries already import, so the fact
// shapes stay owned by their domain modules instead of being re-declared
// here — a field added to `MemberRef` now reaches both registries and the
// `satisfies` check catches the drift.
export type {
  InvitationRef,
  OrganizationRef,
  OrgMembershipRef,
  TemplateTriggerRef
}

interface FactContracts {
  'session.byId': { input: string; fact: SessionRef | null }
  'session.hasOpenForGenerator': { input: string; fact: boolean }
  'generator.byId': { input: string; fact: { id: string } | null }
  'generator.exists': { input: string; fact: boolean }
  'generator.orgId': { input: string; fact: string | null }
  'authz.generator': {
    input: GeneratorUserInput
    fact: GeneratorAuthzFact | null
  }
  'authz.org': { input: string; fact: OrgAuthzFact | null }
  'organization.byId': { input: string; fact: OrganizationRef | null }
  'orgMembership.hasForUserAndOrg': { input: OrgMemberInput; fact: boolean }
  'orgMembership.byUserAndOrg': {
    input: OrgMemberInput
    fact: OrgMembershipRef | null
  }
  'orgMembership.byId': { input: string; fact: OrgMembershipRef | null }
  'assignment.hasForUserAndGenerator': {
    input: GeneratorUserInput
    fact: boolean
  }
  'invitation.byId': { input: string; fact: InvitationRef | null }
  'invitation.byOrgAndEmail': {
    input: { organizationId: string; inviteeEmail: string }
    fact: InvitationRef | null
  }
  'maintenanceTemplate.byId': { input: string; fact: TemplateTriggerRef | null }
  'maintenanceRecord.byId': { input: string; fact: RecordRef | null }
}

export type FactKey = keyof FactContracts
export type FactInput<K extends FactKey> = FactContracts[K]['input']
export type FactOf<K extends FactKey> = FactContracts[K]['fact']
