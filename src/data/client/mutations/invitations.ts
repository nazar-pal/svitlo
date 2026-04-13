import { eq } from 'drizzle-orm'

import { invitations, organizationMembers } from '@/data/client/db-schema'
import type { AcceptInvitationResult } from '@/data/shared/invitations'
import {
  insertInvitationSchema,
  type InsertInvitationInput
} from '@/data/shared/validation'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createInvitationMutations(ctx: MutationContext) {
  return {
    createInvitation: defineMutation<
      [string, InsertInvitationInput],
      InsertInvitationInput
    >(ctx, {
      parse: ([, input]) => insertInvitationSchema.safeParse(input),
      check: (c, [userId], parsed) =>
        c.checks.invitations.createInvitation(
          userId,
          parsed.organizationId,
          parsed.inviteeEmail
        ),
      apply: async ({ ctx: c, db, args: [userId], parsed }) => {
        await db.insert(invitations).values({
          id: c.newId(),
          organizationId: parsed.organizationId,
          inviteeEmail: parsed.inviteeEmail,
          invitedByUserId: userId,
          createdAt: c.now().toISOString()
        })
      }
    }),

    acceptInvitation: defineMutation<
      [string, string, string],
      undefined,
      AcceptInvitationResult
    >(ctx, {
      check: (c, [userId, userEmail, invitationId]) =>
        c.checks.invitations.acceptInvitation(userId, userEmail, invitationId),
      tx: true,
      apply: async ({
        ctx: c,
        db,
        args: [userId, , invitationId],
        checkOk
      }) => {
        await db.insert(organizationMembers).values({
          id: c.newId(),
          organizationId: checkOk.invitation.organizationId,
          userId,
          joinedAt: c.now().toISOString()
        })
        await db.delete(invitations).where(eq(invitations.id, invitationId))
      }
    }),

    declineInvitation: defineMutation<[string, string]>(ctx, {
      check: (c, [userEmail, invitationId]) =>
        c.checks.invitations.declineInvitation(userEmail, invitationId),
      apply: async ({ db, args: [, invitationId] }) => {
        await db.delete(invitations).where(eq(invitations.id, invitationId))
      }
    }),

    cancelInvitation: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, invitationId]) =>
        c.checks.invitations.cancelInvitation(userId, invitationId),
      apply: async ({ db, args: [, invitationId] }) => {
        await db.delete(invitations).where(eq(invitations.id, invitationId))
      }
    })
  }
}
