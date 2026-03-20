import type {
  Generator,
  GeneratorSession
} from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import {
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getAllUsers,
  getGeneratorsByOrg,
  getUserAssignments
} from '@/data/client/queries'
import type { Filter } from '@/lib/activity'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { getUserName } from '@/lib/utils/get-user-name'
import { formatDuration } from '@/lib/utils/time'
import { differenceInMilliseconds, parseISO } from 'date-fns'

export type ActivityItem =
  | {
      type: 'session'
      id: string
      timestamp: string
      generatorTitle: string
      userName: string
      duration: string
      isInProgress: boolean
      session: GeneratorSession
    }
  | {
      type: 'maintenance'
      id: string
      timestamp: string
      generatorTitle: string
      userName: string
      record: MaintenanceRecord
      templateName: string
    }

export function useActivityData(filter: Filter, generatorScope: string | null) {
  const { selectedOrgId } = useSelectedOrg()
  const { userOrgs, isAdmin, userId } = useUserOrgs()
  const admin = isAdmin(selectedOrgId)

  const { data: generators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined
  )

  const { data: myAssignments } = useDrizzleQuery(
    userId ? getUserAssignments(userId) : undefined
  )

  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())
  const { data: allRecords } = useDrizzleQuery(getAllMaintenanceRecords())
  const { data: allTemplates } = useDrizzleQuery(getAllMaintenanceTemplates())
  const { data: users } = useDrizzleQuery(getAllUsers())

  const orgGeneratorIds = new Set(generators.map(g => g.id))
  const myGeneratorIds = new Set(
    myAssignments
      .filter(a => orgGeneratorIds.has(a.generatorId))
      .map(a => a.generatorId)
  )

  const availableGenerators = admin
    ? generators
    : generators.filter(g => myGeneratorIds.has(g.id))

  const effectiveScope = generatorScope ?? (admin ? 'org' : 'my')

  const visibleGeneratorIds =
    effectiveScope === 'org'
      ? admin
        ? orgGeneratorIds
        : myGeneratorIds
      : effectiveScope === 'my'
        ? myGeneratorIds
        : new Set([effectiveScope])

  const resolveUserName = (uid: string) => getUserName(users, uid)

  const items = buildActivityItems(
    allSessions,
    allRecords,
    allTemplates,
    generators,
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
    effectiveScope
  }
}

function buildActivityItems(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  templates: { id: string; taskName: string }[],
  generators: Generator[],
  visibleGeneratorIds: Set<string>,
  filter: Filter,
  resolveUserName: (uid: string) => string
): ActivityItem[] {
  const templateMap = new Map(templates.map(t => [t.id, t.taskName]))
  const generatorMap = new Map(generators.map(g => [g.id, g.title]))

  const items: ActivityItem[] = []

  if (filter !== 'maintenance')
    for (const session of sessions) {
      if (!visibleGeneratorIds.has(session.generatorId)) continue
      const isInProgress = !session.stoppedAt
      items.push({
        type: 'session',
        id: session.id,
        timestamp: session.startedAt,
        generatorTitle: generatorMap.get(session.generatorId) ?? 'Unknown',
        userName: resolveUserName(session.startedByUserId),
        duration: isInProgress
          ? 'In progress'
          : formatDuration(
              differenceInMilliseconds(
                parseISO(session.stoppedAt!),
                parseISO(session.startedAt)
              )
            ),
        isInProgress,
        session
      })
    }

  if (filter !== 'sessions')
    for (const record of records) {
      if (!visibleGeneratorIds.has(record.generatorId)) continue
      items.push({
        type: 'maintenance',
        id: record.id,
        timestamp: record.performedAt,
        generatorTitle: generatorMap.get(record.generatorId) ?? 'Unknown',
        userName: resolveUserName(record.performedByUserId),
        record,
        templateName: templateMap.get(record.templateId) ?? 'Unknown task'
      })
    }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items
}
