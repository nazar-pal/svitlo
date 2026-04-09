import type {
  Generator,
  GeneratorSession,
  GeneratorUserAssignment
} from '@/data/client/db-schema'
import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema/maintenance'
import {
  computeNextMaintenance,
  type NextMaintenanceCardInfo
} from '@/lib/maintenance/due'
import { groupBy } from '@/lib/utils/group-by'

interface GeneratorListInput {
  generators: readonly Generator[]
  allSessions: readonly GeneratorSession[]
  allTemplates: readonly MaintenanceTemplate[]
  allRecords: readonly MaintenanceRecord[]
  allAssignments: readonly GeneratorUserAssignment[]
}

interface GeneratorListModel {
  generators: readonly Generator[]
  allSessions: readonly GeneratorSession[]
  sessionsByGenerator: ReadonlyMap<string, GeneratorSession[]>
  assignmentsByGenerator: ReadonlyMap<string, GeneratorUserAssignment[]>
  nextMaintenanceByGenerator: ReadonlyMap<
    string,
    NextMaintenanceCardInfo | null
  >
}

export function buildGeneratorListModel(
  input: GeneratorListInput
): GeneratorListModel {
  const sessionsByGenerator = groupBy(input.allSessions, s => s.generatorId)
  const templatesByGenerator = groupBy(input.allTemplates, t => t.generatorId)
  const recordsByGenerator = groupBy(input.allRecords, r => r.generatorId)
  const assignmentsByGenerator = groupBy(
    input.allAssignments,
    a => a.generatorId
  )

  const nextMaintenanceByGenerator = new Map<
    string,
    NextMaintenanceCardInfo | null
  >()
  for (const gen of input.generators) {
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
    generators: input.generators,
    allSessions: input.allSessions,
    sessionsByGenerator,
    assignmentsByGenerator,
    nextMaintenanceByGenerator
  }
}
