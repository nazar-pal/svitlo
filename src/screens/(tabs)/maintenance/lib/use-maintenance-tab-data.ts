import {
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getGeneratorsByOrg
} from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeAllMaintenanceItems,
  type MaintenanceItemInfo
} from '@/lib/maintenance/due'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { groupBy } from '@/lib/utils/group-by'

import type { Generator } from '@/data/client/db-schema'

export function useMaintenanceTabData() {
  const { selectedOrgId } = useSelectedOrg()
  const { userOrgs } = useUserOrgs()

  const { data: generators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined
  )
  const { data: allTemplates } = useDrizzleQuery(getAllMaintenanceTemplates())
  const { data: allRecords } = useDrizzleQuery(getAllMaintenanceRecords())
  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())

  const templatesByGenerator = groupBy(allTemplates, t => t.generatorId)
  const recordsByGenerator = groupBy(allRecords, r => r.generatorId)
  const sessionsByGenerator = groupBy(allSessions, s => s.generatorId)

  const generatorsById = new Map<string, Generator>(
    generators.map(g => [g.id, g])
  )

  const allItems: MaintenanceItemInfo[] = generators.flatMap(gen =>
    computeAllMaintenanceItems(
      templatesByGenerator.get(gen.id) ?? [],
      recordsByGenerator.get(gen.id) ?? [],
      sessionsByGenerator.get(gen.id) ?? []
    )
  )

  const overdue = allItems.filter(i => i.urgency === 'overdue')
  const dueSoon = allItems.filter(i => i.urgency === 'due_soon')
  const upcoming = allItems.filter(
    i =>
      i.urgency === 'ok' &&
      (i.hoursRemaining !== null || i.daysRemaining !== null)
  )

  return {
    userOrgs,
    overdue,
    dueSoon,
    upcoming,
    isEmpty: overdue.length + dueSoon.length + upcoming.length === 0,
    generatorsById
  }
}
