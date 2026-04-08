import type {
  Generator,
  GeneratorSession
} from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import type { Filter } from '@/lib/activity-filters'
import { t } from '@/lib/i18n'
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

export function buildActivityItems(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  templates: { id: string; taskName: string }[],
  generators: Generator[],
  visibleGeneratorIds: Set<string>,
  filter: Filter,
  resolveUserName: (uid: string) => string
): ActivityItem[] {
  const templateMap = new Map(templates.map(tmpl => [tmpl.id, tmpl.taskName]))
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
        generatorTitle:
          generatorMap.get(session.generatorId) ??
          t('activity.unknownGenerator'),
        userName: resolveUserName(session.startedByUserId),
        duration: isInProgress
          ? t('activity.inProgress')
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
        generatorTitle:
          generatorMap.get(record.generatorId) ??
          t('activity.unknownGenerator'),
        userName: resolveUserName(record.performedByUserId),
        record,
        templateName:
          templateMap.get(record.templateId) ?? t('activity.unknownTask')
      })
    }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items
}
