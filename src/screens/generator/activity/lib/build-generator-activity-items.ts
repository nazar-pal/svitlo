import type { GeneratorSession } from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import { t } from '@/lib/i18n'
import type { Filter } from '@/lib/activity-filters'

export type ActivityListItem =
  | {
      type: 'session'
      id: string
      timestamp: string
      session: GeneratorSession
    }
  | {
      type: 'maintenance'
      id: string
      timestamp: string
      record: MaintenanceRecord
      templateName: string
    }

export function buildActivityItems(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  templates: { id: string; taskName: string }[],
  filter: Filter
): ActivityListItem[] {
  const templateMap = new Map(templates.map(tmpl => [tmpl.id, tmpl.taskName]))

  const items: ActivityListItem[] = []

  if (filter !== 'maintenance')
    for (const session of sessions)
      items.push({
        type: 'session',
        id: session.id,
        timestamp: session.startedAt,
        session
      })

  if (filter !== 'sessions')
    for (const record of records)
      items.push({
        type: 'maintenance',
        id: record.id,
        timestamp: record.performedAt,
        record,
        templateName:
          templateMap.get(record.templateId) ?? t('activity.unknownTask')
      })

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items
}
