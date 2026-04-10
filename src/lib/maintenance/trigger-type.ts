import { useTranslation } from '@/lib/i18n'

export const TRIGGER_TYPES = ['hours', 'calendar', 'whichever_first'] as const

export type TriggerType = (typeof TRIGGER_TYPES)[number]

export function isTriggerType(value: string): value is TriggerType {
  return (TRIGGER_TYPES as readonly string[]).includes(value)
}

export function showsHours(type: TriggerType): boolean {
  return type === 'hours' || type === 'whichever_first'
}

export function showsCalendar(type: TriggerType): boolean {
  return type === 'calendar' || type === 'whichever_first'
}

export function parseOptionalNumber(
  value: string,
  parse: (s: string) => number
): number | undefined {
  const n = parse(value)
  return Number.isFinite(n) ? n : undefined
}

export function useTriggerLabels(): Record<TriggerType, string> {
  const { t } = useTranslation()
  return {
    hours: t('maintenanceTemplate.byHours'),
    calendar: t('maintenanceTemplate.byCalendar'),
    whichever_first: t('maintenanceTemplate.whicheverFirst')
  }
}
