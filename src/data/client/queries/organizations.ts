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
        eq(invitations.inviteeEmail, inviteeEmail)
      )
    )
    .limit(1)
  return row ?? null
}
