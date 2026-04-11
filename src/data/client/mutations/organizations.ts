import { eq } from 'drizzle-orm'

import { organizations } from '@/data/client/db-schema'
import {
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

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
        createdAt: ctx.now()
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

      // Cascade delete is dialect-specific: client SQLite has no FK
      // constraints, so we walk the relations leaves-first in a single write
      // transaction. The server uses Postgres `onDelete: 'cascade'` on the
      // foreign keys instead. Both paths keep the side effect in the dialect-
      // specific layer rather than trying to share it from the shared policy
      // module.
      await ctx.powersync.writeTransaction(async tx => {
        await tx.execute(
          'DELETE FROM maintenance_records WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
          [orgId]
        )
        await tx.execute(
          'DELETE FROM maintenance_templates WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
          [orgId]
        )
        await tx.execute(
          'DELETE FROM generator_sessions WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
          [orgId]
        )
        await tx.execute(
          'DELETE FROM generator_user_assignments WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
          [orgId]
        )
        await tx.execute('DELETE FROM generators WHERE organization_id = ?', [
          orgId
        ])
        await tx.execute('DELETE FROM invitations WHERE organization_id = ?', [
          orgId
        ])
        await tx.execute(
          'DELETE FROM organization_members WHERE organization_id = ?',
          [orgId]
        )
        await tx.execute('DELETE FROM organizations WHERE id = ?', [orgId])
      })

      return ok
    }
  }
}
