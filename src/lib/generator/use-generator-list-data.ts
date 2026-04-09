import {
  getAllGeneratorAssignments,
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getAllUsers,
  getGeneratorsByOrg
} from '@/data/client/queries'
import { differential } from '@/lib/powersync'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'

import { buildGeneratorListModel } from './generator-list-model'

export function useGeneratorListData() {
  const { selectedOrgId } = useSelectedOrg()

  const { data: generators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined,
    differential()
  )
  const { data: allSessions } = useDrizzleQuery(
    getAllGeneratorSessions(),
    differential()
  )
  const { data: allTemplates } = useDrizzleQuery(
    getAllMaintenanceTemplates(),
    differential()
  )
  const { data: allRecords } = useDrizzleQuery(
    getAllMaintenanceRecords(),
    differential()
  )
  const { data: allAssignments } = useDrizzleQuery(
    getAllGeneratorAssignments(),
    differential()
  )
  const { data: users } = useDrizzleQuery(getAllUsers(), differential())

  const model = buildGeneratorListModel({
    generators,
    allSessions,
    allTemplates,
    allRecords,
    allAssignments
  })

  return { ...model, users }
}
