import { useTranslation } from '@/lib/i18n'

import type { TriggerType } from './trigger-type'

export function useTriggerLabels(): Record<TriggerType, string> {
  const { t } = useTranslation()
  return {
    hours: t('maintenanceTemplate.byHours'),
    calendar: t('maintenanceTemplate.byCalendar'),
    whichever_first: t('maintenanceTemplate.whicheverFirst')
  }
}
