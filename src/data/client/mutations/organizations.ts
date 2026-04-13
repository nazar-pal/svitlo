import { eq } from 'drizzle-orm'

import { organizations } from '@/data/client/db-schema'
import {
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/shared/validation'

import { cascadeDelete } from './cascade'
import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createOrganizationMutations(ctx: MutationContext) {
  return {
    createOrganization: defineMutation<
      [string, InsertOrganizationInput],
      InsertOrganizationInput
    >(ctx, {
      parse: ([, input]) => insertOrganizationSchema.safeParse(input),
      apply: async ({ ctx: c, db, args: [userId], parsed }) => {
        await db.insert(organizations).values({
          id: c.newId(),
          name: parsed.name,
          adminUserId: userId,
          createdAt: c.now().toISOString()
        })
      }
    }),

    renameOrganization: defineMutation<
      [string, string, UpdateOrganizationInput],
      UpdateOrganizationInput
    >(ctx, {
      parse: ([, , input]) => updateOrganizationSchema.safeParse(input),
      check: (c, [userId, orgId]) =>
        c.checks.organizations.renameOrganization(userId, orgId),
      apply: async ({ db, args: [, orgId], parsed }) => {
        await db
          .update(organizations)
          .set({ name: parsed.name })
          .where(eq(organizations.id, orgId))
      }
    }),

    deleteOrganization: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, orgId]) =>
        c.checks.organizations.deleteOrganization(userId, orgId),
      tx: true,
      apply: async ({ db, args: [, orgId] }) => {
        await cascadeDelete(db, organizations, organizations.id, orgId)
      }
    })
  }
}
