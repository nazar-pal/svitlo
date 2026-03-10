import {
  DrizzleAppSchema,
  wrapPowerSyncWithDrizzle
} from '@powersync/drizzle-driver'
import { OPSqliteOpenFactory } from '@powersync/op-sqlite'
import { PowerSyncDatabase } from '@powersync/react-native'

import { user } from '../../data/client/db-schema'

const factory = new OPSqliteOpenFactory({ dbFilename: 'svitlo.db' })
const schema = new DrizzleAppSchema({ user })

export const powersync = new PowerSyncDatabase({ schema, database: factory })

export const db = wrapPowerSyncWithDrizzle(powersync, {
  schema: { user }
})
