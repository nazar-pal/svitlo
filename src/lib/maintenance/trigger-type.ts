export const TRIGGER_TYPES = ['hours', 'calendar', 'whichever_first'] as const

export type TriggerType = (typeof TRIGGER_TYPES)[number]

export function isTriggerType(value: string): value is TriggerType {
  return (TRIGGER_TYPES as readonly string[]).includes(value)
}

export function usesHours(type: TriggerType): boolean {
  return type === 'hours' || type === 'whichever_first'
}

export function usesCalendar(type: TriggerType): boolean {
  return type === 'calendar' || type === 'whichever_first'
}

export function parseOptionalNumber(
  value: string,
  parse: (s: string) => number
): number | undefined {
  const n = parse(value)
  return Number.isFinite(n) ? n : undefined
}
