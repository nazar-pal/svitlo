import { and, isNull, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from '@/data/server/db-schema'

export async function backfillPendingInvitationsForUser(
  database: PgDatabase<PgQueryResultHKT, typeof schema>,
  user: { id: string; email: string }
) {
  await database
    .update(schema.invitations)
    .set({ inviteeUserId: user.id })
    .where(
      and(
        sql`LOWER(${schema.invitations.inviteeEmail}) = ${user.email.toLowerCase()}`,
        isNull(schema.invitations.inviteeUserId)
      )
    )
}
