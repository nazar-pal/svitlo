// Fact shapes the maintenance-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

import type { TriggerType } from '@/lib/maintenance/trigger-type'

export interface TemplateRef {
  generatorId: string
  triggerType: TriggerType
  triggerHoursInterval: number | null
  triggerCalendarDays: number | null
}

export interface RecordRef {
  generatorId: string
  // performedByUserId is only consumed by the server-only defence-in-depth
  // "only the owner can delete their record" rule layered on top of the
  // shared check. The client has no equivalent requirement, but it costs
  // nothing to carry the same column through both adapters.
  performedByUserId: string
}

// Port: anything that can answer these three questions is a valid fact source.
// `findTemplate` / `findRecord` return `null` when the row does not exist.
export interface MaintenanceFactsProvider {
  generatorExists(generatorId: string): Promise<boolean>
  findTemplate(templateId: string): Promise<TemplateRef | null>
  findRecord(recordId: string): Promise<RecordRef | null>
}
