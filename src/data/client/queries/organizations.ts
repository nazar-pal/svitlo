import { eq } from 'drizzle-orm'

import { invitations, organizationMembers, organizations } from '../db-schema'
import { db } from '@/lib/powersync/database'

// Reactive Drizzle builders for `useDrizzleQuery` subscriptions. Row-form
// awaited queries for the mutation path live in the fact registry
// (`@/data/client/registry.ts`) so async + reactive share one source of
// SQL per fact.

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
