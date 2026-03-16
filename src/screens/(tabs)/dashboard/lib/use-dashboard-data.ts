import {
  getAllGeneratorSessions,
  getAllMaintenanceRecords,
  getAllMaintenanceTemplates,
  getAllUsers,
  getGeneratorsByOrg,
  getUserAssignments
} from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/hooks/use-selected-org'
import { useUserOrgs } from '@/lib/hooks/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'
import { groupBy } from '@/lib/group-by'
import { computeGeneratorStatus } from '@/lib/hooks/use-generator-status'
import {
  computeNextMaintenance,
  type NextMaintenanceCardInfo
} from '@/lib/hooks/use-maintenance-due'
import { hoursBetween } from '@/lib/time'

export function useDashboardData() {
  const localUser = useLocalUser()
  const userId = localUser?.id ?? ''
  const { userOrgs } = useUserOrgs()
  const { selectedOrgId } = useSelectedOrg()

  const { data: allGenerators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined
  )
  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())
  const { data: allTemplates } = useDrizzleQuery(getAllMaintenanceTemplates())
  const { data: allRecords } = useDrizzleQuery(getAllMaintenanceRecords())
  const { data: allUsers } = useDrizzleQuery(getAllUsers())
  const { data: myAssignments } = useDrizzleQuery(
    userId ? getUserAssignments(userId) : undefined
  )

  // Pre-index
  const sessionsByGenerator = groupBy(allSessions, s => s.generatorId)
  const templatesByGenerator = groupBy(allTemplates, t => t.generatorId)
  const recordsByGenerator = groupBy(allRecords, r => r.generatorId)
  const usersById = new Map(allUsers.map(u => [u.id, u]))

  // Per-generator status and next maintenance
  const statusByGenerator = new Map<
    string,
    ReturnType<typeof computeGeneratorStatus>
  >()
  const nextMaintenanceByGenerator = new Map<
    string,
    NextMaintenanceCardInfo | null
  >()
  for (const gen of allGenerators) {
    const sessions = sessionsByGenerator.get(gen.id) ?? []
    statusByGenerator.set(gen.id, computeGeneratorStatus(gen, sessions))
    nextMaintenanceByGenerator.set(
      gen.id,
      computeNextMaintenance(
        templatesByGenerator.get(gen.id) ?? [],
        recordsByGenerator.get(gen.id) ?? [],
        sessions
      )
    )
  }

  // My active session
  const myActiveSession =
    allSessions.find(s => !s.stoppedAt && s.startedByUserId === userId) ?? null
  const myActiveGenerator = myActiveSession
    ? (allGenerators.find(g => g.id === myActiveSession.generatorId) ?? null)
    : null

  // Warning generators
  const now = new Date().toISOString()
  const warningGenerators = allGenerators.filter(gen => {
    const { status, openSession, consecutiveRunHours } = statusByGenerator.get(
      gen.id
    )!
    if (status !== 'running' || !openSession) return false
    const staticElapsed = hoursBetween(openSession.startedAt, now)
    const progress =
      (consecutiveRunHours + staticElapsed) / gen.maxConsecutiveRunHours
    return progress >= gen.runWarningThresholdPct / 100
  })

  // Overdue maintenance items
  const overdueItems = allGenerators.flatMap(gen => {
    const next = nextMaintenanceByGenerator.get(gen.id)
    if (!next || next.urgency !== 'overdue') return []
    return [{ gen, next }]
  })

  // Resting generators
  const restingGenerators = allGenerators.filter(
    gen => statusByGenerator.get(gen.id)!.status === 'resting'
  )

  // Upcoming maintenance
  const upcomingItems = allGenerators
    .flatMap(gen => {
      const next = nextMaintenanceByGenerator.get(gen.id)
      if (!next || next.urgency === 'overdue') return []
      return [{ gen, next }]
    })
    .sort((a, b) => maintenanceSortValue(a.next) - maintenanceSortValue(b.next))
    .slice(0, 5)

  const hasAttentionItems =
    warningGenerators.length > 0 ||
    overdueItems.length > 0 ||
    restingGenerators.length > 0

  // My generators
  const assignedGeneratorIds = new Set(myAssignments.map(a => a.generatorId))

  let recentInteractionGeneratorId: string | null = null
  let recentInteractionTime = ''
  for (const session of allSessions) {
    if (
      session.startedByUserId !== userId &&
      session.stoppedByUserId !== userId
    )
      continue
    if (assignedGeneratorIds.has(session.generatorId)) continue
    const t = session.stoppedAt ?? session.startedAt
    if (!t) continue
    if (t > recentInteractionTime) {
      recentInteractionTime = t
      recentInteractionGeneratorId = session.generatorId
    }
  }

  const myGeneratorIds = new Set([
    ...assignedGeneratorIds,
    ...(recentInteractionGeneratorId ? [recentInteractionGeneratorId] : [])
  ])

  const myGenerators = allGenerators.filter(
    g => myGeneratorIds.has(g.id) && g.id !== myActiveGenerator?.id
  )

  return {
    userId,
    userOrgs,
    allGenerators,
    sessionsByGenerator,
    statusByGenerator,
    nextMaintenanceByGenerator,
    usersById,
    myActiveSession,
    myActiveGenerator,
    warningGenerators,
    overdueItems,
    restingGenerators,
    upcomingItems,
    hasAttentionItems,
    myGenerators
  }
}

function maintenanceSortValue(info: NextMaintenanceCardInfo): number {
  const { hoursRemaining, daysRemaining } = info
  if (hoursRemaining !== null && daysRemaining !== null)
    return Math.min(hoursRemaining, daysRemaining * 24)
  if (hoursRemaining !== null) return hoursRemaining
  return (daysRemaining ?? Infinity) * 24
}
