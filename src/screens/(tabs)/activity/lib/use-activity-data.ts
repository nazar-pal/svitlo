import {
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getAllUsers
} from '@/data/client/queries'
import type { Filter } from '@/lib/activity-filters'
import { useGeneratorScope } from '@/lib/generator/use-generator-scope'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { getUserName } from '@/lib/utils/get-user-name'

import { buildActivityItems } from './build-activity-items'

export type { ActivityItem } from './build-activity-items'

export function useActivityData(filter: Filter) {
  const {
    userOrgs,
    admin,
    userId,
    availableGenerators,
    effectiveScope,
    visibleGeneratorIds,
    setGeneratorScope
  } = useGeneratorScope()

  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())
  const { data: allRecords } = useDrizzleQuery(getAllMaintenanceRecords())
  const { data: allTemplates } = useDrizzleQuery(getAllMaintenanceTemplates())
  const { data: users } = useDrizzleQuery(getAllUsers())

  const resolveUserName = (uid: string) => getUserName(users, uid)

  const items = buildActivityItems(
    allSessions,
    allRecords,
    allTemplates,
    availableGenerators,
    visibleGeneratorIds,
    filter,
    resolveUserName
  )

  return {
    userOrgs,
    admin,
    userId: userId ?? '',
    items,
    availableGenerators,
    effectiveScope,
    setGeneratorScope
  }
}
