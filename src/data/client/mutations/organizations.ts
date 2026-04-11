import { eq, inArray } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  invitations,
  maintenanceRecords,
  maintenanceTemplates,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
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

      // Cascade delete is dialect-specific: client SQLite has no FK
      // constraints, so we walk the relations leaves-first in a single write
      // transaction. The server uses Postgres `onDelete: 'cascade'` on the
      // foreign keys instead. Both paths keep the side effect in the dialect-
      // specific layer rather than trying to share it from the shared policy
      // module.
      await ctx.writeTx(async tx => {
        const genIdsForOrg = tx
          .select({ id: generators.id })
          .from(generators)
          .where(eq(generators.organizationId, orgId))

        await tx
          .delete(maintenanceRecords)
          .where(inArray(maintenanceRecords.generatorId, genIdsForOrg))
        await tx
          .delete(maintenanceTemplates)
          .where(inArray(maintenanceTemplates.generatorId, genIdsForOrg))
        await tx
          .delete(generatorSessions)
          .where(inArray(generatorSessions.generatorId, genIdsForOrg))
        await tx
          .delete(generatorUserAssignments)
          .where(inArray(generatorUserAssignments.generatorId, genIdsForOrg))
        await tx.delete(generators).where(eq(generators.organizationId, orgId))
        await tx
          .delete(invitations)
          .where(eq(invitations.organizationId, orgId))
        await tx
          .delete(organizationMembers)
          .where(eq(organizationMembers.organizationId, orgId))
        await tx.delete(organizations).where(eq(organizations.id, orgId))
      })

      return ok
    }
  }
}
