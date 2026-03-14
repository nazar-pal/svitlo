interface MaintenanceSuggestion {
  taskName: string
  description: string
  triggerType: 'hours' | 'calendar' | 'whichever_first'
  triggerHoursInterval: number | null
  triggerCalendarDays: number | null
  isOneTime: boolean
}

export interface SuggestionsData {
  maxConsecutiveRunHours: number | null
  requiredRestHours: number | null
  tasks: MaintenanceSuggestion[]
  sources: string[]
  modelInfo: string
}

let pendingSuggestions: SuggestionsData | null = null

export function setPendingSuggestions(data: SuggestionsData) {
  pendingSuggestions = data
}

export function consumePendingSuggestions() {
  const data = pendingSuggestions
  pendingSuggestions = null
  return data
}
