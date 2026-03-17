import {
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getGeneratorsByOrg
} from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeNextMaintenance,
  type NextMaintenanceCardInfo
} from '@/lib/maintenance/due'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { groupBy } from '@/lib/utils/group-by'

export function useGeneratorListData() {
  const { selectedOrgId } = useSelectedOrg()

  const { data: generators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined
  )
  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())
  const { data: allTemplates } = useDrizzleQuery(getAllMaintenanceTemplates())
  const { data: allRecords } = useDrizzleQuery(getAllMaintenanceRecords())

  const sessionsByGenerator = groupBy(allSessions, s => s.generatorId)
  const templatesByGenerator = groupBy(allTemplates, t => t.generatorId)
  const recordsByGenerator = groupBy(allRecords, r => r.generatorId)

  const nextMaintenanceByGenerator = new Map<
    string,
    NextMaintenanceCardInfo | null
  >()
  for (const gen of generators) {
    nextMaintenanceByGenerator.set(
      gen.id,
      computeNextMaintenance(
        templatesByGenerator.get(gen.id) ?? [],
        recordsByGenerator.get(gen.id) ?? [],
        sessionsByGenerator.get(gen.id) ?? []
      )
    )
  }

  return {
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator
  }
}
