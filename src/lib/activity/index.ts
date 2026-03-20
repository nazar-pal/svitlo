export const FILTERS = ['all', 'sessions', 'maintenance'] as const
export type Filter = (typeof FILTERS)[number]

export const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  sessions: 'Runs',
  maintenance: 'Maintenance'
}
