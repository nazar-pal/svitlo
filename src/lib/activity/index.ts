import type { ParseKeys } from 'i18next'

import { t } from '@/lib/i18n'

export const FILTERS = ['all', 'sessions', 'maintenance'] as const
export type Filter = (typeof FILTERS)[number]

const FILTER_KEYS = {
  all: 'filters.all',
  sessions: 'filters.sessions',
  maintenance: 'filters.maintenance'
} as const satisfies Record<Filter, ParseKeys>

export function filterLabel(filter: Filter): string {
  return t(FILTER_KEYS[filter])
}
