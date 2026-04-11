import { eq } from 'drizzle-orm'

import { invitations, organizationMembers } from '@/data/client/db-schema'
import {
  insertInvitationSchema,
  type InsertInvitationInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createInvitationMutations(ctx: MutationContext) {
  return {
    async createInvitation(
      userId: string,
      input: InsertInvitationInput
    ): Promise<MutationResult> {
      const parsed = insertInvitationSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const check = await ctx.checks.invitations.createInvitation(
        userId,
        parsed.data.organizationId,
        parsed.data.inviteeEmail
      )
      if (!check.ok) return fail(check.code)

      await ctx.db.insert(invitations).values({
        id: ctx.newId(),
        organizationId: parsed.data.organizationId,
        inviteeEmail: parsed.data.inviteeEmail,
        invitedByUserId: userId,
        createdAt: ctx.now().toISOString()
      })

      return ok
    },

    async acceptInvitation(
      userId: string,
      userEmail: string,
      invitationId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.invitations.acceptInvitation(
        userId,
        userEmail,
        invitationId
      )
      if (!check.ok) return fail(check.code)

      await ctx.writeTx(async tx => {
        await tx.insert(organizationMembers).values({
          id: ctx.newId(),
          organizationId: check.invitation.organizationId,
          userId,
          joinedAt: ctx.now().toISOString()
        })
        await tx.delete(invitations).where(eq(invitations.id, invitationId))
      })

      return ok
    },

    async declineInvitation(
      userEmail: string,
      invitationId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.invitations.declineInvitation(
        userEmail,
        invitationId
      )
      if (!check.ok) return fail(check.code)

      await ctx.db.delete(invitations).where(eq(invitations.id, invitationId))

      return ok
    },

    async cancelInvitation(
      userId: string,
      invitationId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.invitations.cancelInvitation(
        userId,
        invitationId
      )
      if (!check.ok) return fail(check.code)

      await ctx.db.delete(invitations).where(eq(invitations.id, invitationId))

      return ok
    }
  }
}
