import { compareDesc, parseISO } from 'date-fns'

import type { GeneratorSession } from '@/data/client/db-schema'
import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema/maintenance'
import { hoursBetween } from '@/lib/time'

export type MaintenanceUrgency = 'overdue' | 'due_soon' | 'ok'

export interface MaintenanceDueInfo {
  templateId: string
  generatorId: string
  urgency: MaintenanceUrgency
  lastPerformedAt: string | null
}

function daysBetween(start: string, end: string): number {
  return hoursBetween(start, end) / 24
}

/**
 * Sum session hours that occurred after a given timestamp.
 * For open sessions, counts up to now.
 */
function sessionHoursSince(
  sessions: GeneratorSession[],
  since: string | null
): number {
  let total = 0
  for (const session of sessions) {
    if (since && session.startedAt < since) continue
    const end = session.stoppedAt ?? new Date().toISOString()
    const start = since && session.startedAt < since ? since : session.startedAt
    total += hoursBetween(start, end)
  }
  return total
}

function totalSessionHours(sessions: GeneratorSession[]): number {
  return sessionHoursSince(sessions, null)
}

// ── Shared remaining-time calculation ──────────────────────────────────────

interface RemainingTime {
  hoursRemaining: number | null
  daysRemaining: number | null
}

function computeRemaining(
  template: MaintenanceTemplate,
  lastPerformedAt: string | null,
  sessions: GeneratorSession[],
  now: string
): RemainingTime {
  let hoursRemaining: number | null = null
  let daysRemaining: number | null = null

  if (
    template.triggerType === 'hours' ||
    template.triggerType === 'whichever_first'
  ) {
    const interval = template.triggerHoursInterval!
    const hoursSince = lastPerformedAt
      ? sessionHoursSince(sessions, lastPerformedAt)
      : totalSessionHours(sessions)
    hoursRemaining = interval - hoursSince
  }

  if (
    template.triggerType === 'calendar' ||
    template.triggerType === 'whichever_first'
  ) {
    const intervalDays = template.triggerCalendarDays!
    const referenceDate = lastPerformedAt ?? template.createdAt
    daysRemaining = intervalDays - daysBetween(referenceDate, now)
  }

  return { hoursRemaining, daysRemaining }
}

function urgencyFromRemaining(
  { hoursRemaining, daysRemaining }: RemainingTime,
  template: MaintenanceTemplate
): MaintenanceUrgency {
  if (
    (hoursRemaining !== null && hoursRemaining <= 0) ||
    (daysRemaining !== null && daysRemaining <= 0)
  )
    return 'overdue'

  if (
    (hoursRemaining !== null &&
      template.triggerHoursInterval != null &&
      hoursRemaining <= template.triggerHoursInterval * 0.2) ||
    (daysRemaining !== null &&
      template.triggerCalendarDays != null &&
      daysRemaining <= template.triggerCalendarDays * 0.2)
  )
    return 'due_soon'

  return 'ok'
}

function lastRecordForTemplate(
  records: MaintenanceRecord[],
  templateId: string
): MaintenanceRecord | undefined {
  return records
    .filter(r => r.templateId === templateId)
    .sort((a, b) =>
      compareDesc(parseISO(a.performedAt), parseISO(b.performedAt))
    )[0]
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the due/overdue status for a maintenance template.
 */
export function computeMaintenanceDue(
  template: MaintenanceTemplate,
  records: MaintenanceRecord[],
  sessions: GeneratorSession[]
): MaintenanceDueInfo {
  const lastRecord = lastRecordForTemplate(records, template.id)
  const lastPerformedAt = lastRecord?.performedAt ?? null
  const now = new Date().toISOString()

  const remaining = computeRemaining(template, lastPerformedAt, sessions, now)
  const urgency = urgencyFromRemaining(remaining, template)

  return {
    templateId: template.id,
    generatorId: template.generatorId,
    urgency,
    lastPerformedAt
  }
}

export interface NextMaintenanceCardInfo {
  templateId: string
  taskName: string
  urgency: MaintenanceUrgency
  hoursRemaining: number | null
  daysRemaining: number | null
}

/**
 * Find the most urgent maintenance item for a generator.
 * Returns null if there are no templates.
 */
export function computeNextMaintenance(
  templates: MaintenanceTemplate[],
  records: MaintenanceRecord[],
  sessions: GeneratorSession[]
): NextMaintenanceCardInfo | null {
  if (templates.length === 0) return null

  const now = new Date().toISOString()

  interface Candidate extends NextMaintenanceCardInfo {
    sortValue: number
  }

  const candidates: Candidate[] = templates.map(template => {
    const lastRecord = lastRecordForTemplate(records, template.id)
    const lastPerformedAt = lastRecord?.performedAt ?? null

    const { hoursRemaining, daysRemaining } = computeRemaining(
      template,
      lastPerformedAt,
      sessions,
      now
    )

    const urgency = urgencyFromRemaining(
      { hoursRemaining, daysRemaining },
      template
    )

    let sortValue: number
    if (hoursRemaining !== null && daysRemaining !== null)
      sortValue = Math.min(hoursRemaining, daysRemaining * 24)
    else if (hoursRemaining !== null) sortValue = hoursRemaining
    else sortValue = (daysRemaining ?? Infinity) * 24

    return {
      templateId: template.id,
      taskName: template.taskName,
      urgency,
      sortValue,
      hoursRemaining,
      daysRemaining
    }
  })

  const urgencyRank = { overdue: 0, due_soon: 1, ok: 2 } as const
  candidates.sort((a, b) => {
    const tierDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency]
    if (tierDiff !== 0) return tierDiff
    return a.sortValue - b.sortValue
  })

  const best = candidates[0]
  return {
    templateId: best.templateId,
    taskName: best.taskName,
    urgency: best.urgency,
    hoursRemaining: best.hoursRemaining,
    daysRemaining: best.daysRemaining
  }
}
