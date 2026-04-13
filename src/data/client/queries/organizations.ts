import { and, eq } from 'drizzle-orm'

import {
  invitations,
  organizationMembers,
  organizations,
  type Invitation,
  type Organization,
  type OrganizationMember
} from '../db-schema'
import { db, type ClientDb } from '@/lib/powersync/database'

// ── Builder form (for useDrizzleQuery) ──────────────────────────────────────

export function getAllOrganizations() {
  return db.select().from(organizations)
}

export function getOrganization(id: string) {
  return db.select().from(organizations).where(eq(organizations.id, id))
}

export function getOrgMembers(organizationId: string) {
  return db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId))
}

export function getUserMemberOrgIds(userId: string) {
  return db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
}

export function getOrgInvitations(organizationId: string) {
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.organizationId, organizationId))
}

export function getInvitationsByEmail(email: string) {
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.inviteeEmail, email))
}

// Id-only projection for reactive existence checks — matches the shape
// `findInvitationByOrgAndEmail` in the async provider, but builder-form so
// `useCanCreateInvitation` can subscribe without awaiting. Email normalised
// here so the case-insensitive policy invariant documented in
// `src/data/shared/invitations/index.ts` holds regardless of caller hygiene.
export function findInvitationByOrgAndEmailQuery(
  db: ClientDb,
  organizationId: string,
  inviteeEmail: string
) {
  return db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.inviteeEmail, inviteeEmail.trim().toLowerCase())
      )
    )
    .limit(1)
}

// Builder form of `getInvitationById` — two-stage subscription pattern (the
// reactive hook first resolves the invitation to pull `organizationId`, then
// subscribes to org authz).
export function getInvitationByIdQuery(db: ClientDb, invitationId: string) {
  return db
    .select({
      organizationId: invitations.organizationId,
      inviteeEmail: invitations.inviteeEmail
    })
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1)
}

// Builder form of `getOrgMembershipById` — two-stage subscription pattern:
// `useCanRemoveMember` resolves the member row to pull `organizationId`,
// then subscribes to org authz.
export function getMembershipByIdQuery(db: ClientDb, memberId: string) {
  return db
    .select({
      id: organizationMembers.id,
      organizationId: organizationMembers.organizationId,
      userId: organizationMembers.userId
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.id, memberId))
    .limit(1)
}

// ── Row form (awaited, for mutations) ───────────────────────────────────────

export async function getOrganizationById(
  db: ClientDb,
  id: string
): Promise<Organization | null> {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)
  return row ?? null
}

export async function getOrganizationAdminUserId(
  db: ClientDb,
  id: string
): Promise<string | null> {
  const [row] = await db
    .select({ adminUserId: organizations.adminUserId })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)
  return row?.adminUserId ?? null
}

export async function getOrgMemberById(
  db: ClientDb,
  userId: string,
  organizationId: string
): Promise<OrganizationMember | null> {
  const [row] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function getOrgMembershipById(
  db: ClientDb,
  id: string
): Promise<OrganizationMember | null> {
  const [row] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, id))
    .limit(1)
  return row ?? null
}

export async function getInvitationById(
  db: ClientDb,
  id: string
): Promise<Invitation | null> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, id))
    .limit(1)
  return row ?? null
}

export async function getInvitationByOrgAndEmail(
  db: ClientDb,
  organizationId: string,
  inviteeEmail: string
): Promise<Invitation | null> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.inviteeEmail, inviteeEmail.trim().toLowerCase())
      )
    )
    .limit(1)
  return row ?? null
}
