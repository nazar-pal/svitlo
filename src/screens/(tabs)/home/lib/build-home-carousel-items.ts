import type {
  Generator,
  GeneratorSession,
  GeneratorUserAssignment
} from '@/data/client/db-schema/generators'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/generator/status'
import type { NextMaintenanceCardInfo } from '@/lib/maintenance/due'
import { getUserName } from '@/lib/utils/get-user-name'

import type { HeroCardItem } from '../components/hero-card'

export interface BuildHomeCarouselItemsInput {
  generators: readonly Generator[]
  sessionsByGenerator: ReadonlyMap<string, readonly GeneratorSession[]>
  assignmentsByGenerator: ReadonlyMap<
    string,
    readonly GeneratorUserAssignment[]
  >
  nextMaintenanceByGenerator: ReadonlyMap<
    string,
    NextMaintenanceCardInfo | null
  >
  myActiveSession: GeneratorSession | null
  users: readonly { id: string; name: string }[]
  admin: boolean
}

export function buildHomeCarouselItems(
  input: BuildHomeCarouselItemsInput
): HeroCardItem[] {
  const {
    generators,
    sessionsByGenerator,
    assignmentsByGenerator,
    nextMaintenanceByGenerator,
    myActiveSession,
    users,
    admin
  } = input

  return generators.map(g => {
    const sessions = [...(sessionsByGenerator.get(g.id) ?? [])]
    const assignments = assignmentsByGenerator.get(g.id) ?? []
    return {
      generator: g,
      statusInfo: computeGeneratorStatus(g, sessions),
      nextMaintenance: nextMaintenanceByGenerator.get(g.id) ?? null,
      isMyActiveSession: myActiveSession?.generatorId === g.id,
      lifetimeHours: computeLifetimeHours(sessions),
      assignedUserNames: admin
        ? assignments.map(a => getUserName(users, a.userId))
        : []
    }
  })
}
