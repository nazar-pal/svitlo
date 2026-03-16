import { formatHours } from '@/lib/hooks/use-elapsed-time'
import type { NextMaintenanceCardInfo } from '@/lib/hooks/use-maintenance-due'

export function formatUpcoming(info: NextMaintenanceCardInfo): string {
  const { hoursRemaining, daysRemaining } = info
  if (hoursRemaining !== null && daysRemaining !== null)
    return hoursRemaining <= daysRemaining * 24
      ? `in ${formatHours(hoursRemaining)}`
      : `in ${Math.round(daysRemaining)}d`
  if (hoursRemaining !== null) return `in ${formatHours(hoursRemaining)}`
  if (daysRemaining !== null) return `in ${Math.round(daysRemaining)}d`
  return ''
}
