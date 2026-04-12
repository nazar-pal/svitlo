import { eq, getTableName, inArray, type SQL } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'

import {
  generators,
  generatorSessions,
  generatorUserAssignments
} from '@/data/client/db-schema/generators'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema/maintenance'
import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema/organizations'
import { user } from '@/data/client/db-schema/user'
import type { ClientDb } from '@/lib/powersync/database'

interface CascadeEdge {
  parent: SQLiteTable
  child: SQLiteTable
  parentKey: SQLiteColumn
  childFk: SQLiteColumn
}

export const CASCADE_EDGES: readonly CascadeEdge[] = [
  {
    parent: organizations,
    child: generators,
    parentKey: organizations.id,
    childFk: generators.organizationId
  },
  {
    parent: organizations,
    child: organizationMembers,
    parentKey: organizations.id,
    childFk: organizationMembers.organizationId
  },
  {
    parent: organizations,
    child: invitations,
    parentKey: organizations.id,
    childFk: invitations.organizationId
  },
  {
    parent: generators,
    child: generatorUserAssignments,
    parentKey: generators.id,
    childFk: generatorUserAssignments.generatorId
  },
  {
    parent: generators,
    child: generatorSessions,
    parentKey: generators.id,
    childFk: generatorSessions.generatorId
  },
  {
    parent: generators,
    child: maintenanceTemplates,
    parentKey: generators.id,
    childFk: maintenanceTemplates.generatorId
  },
  {
    parent: generators,
    child: maintenanceRecords,
    parentKey: generators.id,
    childFk: maintenanceRecords.generatorId
  },
  {
    parent: maintenanceTemplates,
    child: maintenanceRecords,
    parentKey: maintenanceTemplates.id,
    childFk: maintenanceRecords.templateId
  },
  {
    parent: user,
    child: organizationMembers,
    parentKey: user.id,
    childFk: organizationMembers.userId
  },
  {
    parent: user,
    child: invitations,
    parentKey: user.id,
    childFk: invitations.invitedByUserId
  },
  {
    parent: user,
    child: generatorUserAssignments,
    parentKey: user.id,
    childFk: generatorUserAssignments.userId
  }
]

export async function cascadeDelete(
  tx: ClientDb,
  root: SQLiteTable,
  rootKey: SQLiteColumn,
  id: string
): Promise<void> {
  const ops: { table: SQLiteTable; predicate: SQL }[] = []
  const visited = new Set<string>()

  function walk(table: SQLiteTable, predicate: SQL) {
    const name = getTableName(table)
    if (visited.has(name)) return
    visited.add(name)

    for (const edge of CASCADE_EDGES) {
      if (edge.parent !== table) continue
      if (visited.has(getTableName(edge.child))) continue

      const childPredicate =
        table === root
          ? eq(edge.childFk, id)
          : inArray(
              edge.childFk,
              tx
                .select({ v: edge.parentKey })
                .from(edge.parent)
                .where(predicate)
            )

      walk(edge.child, childPredicate)
    }

    ops.push({ table, predicate })
  }

  walk(root, eq(rootKey, id))

  for (const op of ops) await tx.delete(op.table).where(op.predicate)
}
