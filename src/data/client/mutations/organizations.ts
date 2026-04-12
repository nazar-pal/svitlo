import { eq } from 'drizzle-orm'

import { organizations } from '@/data/client/db-schema'
import {
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/shared/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import { cascadeDelete } from './cascade'
import type { MutationContext } from './context'

export function createOrganizationMutations(ctx: MutationContext) {
  return {
    async createOrganization(
      userId: string,
      input: InsertOrganizationInput
    ): Promise<MutationResult> {
      const parsed = insertOrganizationSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      await ctx.db.insert(organizations).values({
        id: ctx.newId(),
        name: parsed.data.name,
        adminUserId: userId,
        createdAt: ctx.now().toISOString()
      })

      return ok
    },

    async renameOrganization(
      userId: string,
      orgId: string,
      input: UpdateOrganizationInput
    ): Promise<MutationResult> {
      const parsed = updateOrganizationSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const check = await ctx.checks.organizations.renameOrganization(
        userId,
        orgId
      )
      if (!check.ok) return fail(check.code)

      await ctx.db
        .update(organizations)
        .set({ name: parsed.data.name })
        .where(eq(organizations.id, orgId))

      return ok
    },

    async deleteOrganization(
      userId: string,
      orgId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.organizations.deleteOrganization(
        userId,
        orgId
      )
      if (!check.ok) return fail(check.code)

      await ctx.writeTx(async tx => {
        await cascadeDelete(tx, organizations, organizations.id, orgId)
      })

      return ok
    }
  }
}
