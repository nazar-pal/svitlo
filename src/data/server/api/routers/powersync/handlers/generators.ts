import { eq } from 'drizzle-orm'

import {
  insertGeneratorSchema,
  updateGeneratorSchema
} from '@/data/shared/validation'
import { generators } from '@/data/server/db-schema'

import { defineTableHandler } from './pipeline'

export const handleGenerators = defineTableHandler({
  table: generators,
  insert: {
    schema: insertGeneratorSchema,
    errorLabel: 'generator insert',
    check: ({ userId, checks }, parsed) =>
      checks.generators.createGenerator(userId, parsed.organizationId),
    apply: async ({ db, id }, parsed) => {
      await db
        .insert(generators)
        .values({ ...parsed, id })
        .onConflictDoNothing()
    }
  },
  update: {
    schema: updateGeneratorSchema,
    errorLabel: 'generator update',
    check: ({ userId, id, checks }) =>
      checks.generators.updateGenerator(userId, id),
    apply: async ({ db, id }, parsed) => {
      if (Object.keys(parsed).length > 0)
        await db.update(generators).set(parsed).where(eq(generators.id, id))
    }
  },
  delete: {
    check: ({ userId, id, checks }) =>
      checks.generators.deleteGenerator(userId, id),
    shield: { kind: 'notFound', code: 'GENERATOR_NOT_FOUND' },
    apply: async ({ db, id }) => {
      await db.delete(generators).where(eq(generators.id, id))
    }
  }
})
