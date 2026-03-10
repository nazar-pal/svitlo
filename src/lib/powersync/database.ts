import {
  DrizzleAppSchema,
  wrapPowerSyncWithDrizzle
} from '@powersync/drizzle-driver'
import { OPSqliteOpenFactory } from '@powersync/op-sqlite'
import { PowerSyncDatabase } from '@powersync/react-native'

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
