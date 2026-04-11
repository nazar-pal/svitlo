import {
  DrizzleAppSchema,
  wrapPowerSyncWithDrizzle
} from '@powersync/drizzle-driver'
import { OPSqliteOpenFactory } from '@powersync/op-sqlite'
import { PowerSyncDatabase } from '@powersync/react-native'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import {
  user,
  organizations,
  organizationMembers,
  invitations,
  generators,
  generatorUserAssignments,
  generatorSessions,
  maintenanceTemplates,
  maintenanceRecords
} from '../../data/client/db-schema'

const tables = {
  user,
  organizations,
  organizationMembers,
  invitations,
  generators,
  generatorUserAssignments,
  generatorSessions,
  maintenanceTemplates,
  maintenanceRecords
}

const factory = new OPSqliteOpenFactory({ dbFilename: 'svitlo.db' })
const schema = new DrizzleAppSchema(tables)

export const powersync = new PowerSyncDatabase({ schema, database: factory })

export const db = wrapPowerSyncWithDrizzle(powersync, {
  schema: tables
})

// Broadened to accept both the production PowerSync-wrapped drizzle handle
// and the `better-sqlite3` drizzle handle used in tests. Both extend
// BaseSQLiteDatabase, which is the common ancestor drizzle exposes. The row-
// form query helpers and mutation context only use schema-agnostic builder
// methods (select/insert/update/delete), so loose generics are safe here.
export type ClientDb = BaseSQLiteDatabase<'async' | 'sync', unknown, any, any>
