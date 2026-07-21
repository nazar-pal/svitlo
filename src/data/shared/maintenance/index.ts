import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'
import {
  type TriggerType,
  usesCalendar,
  usesHours
} from '@/lib/maintenance/trigger-type'

export type { PolicyResult }

// Fact shapes the maintenance-lifecycle policy needs. Adapters fetch raw
// rows and normalize into these schema-agnostic shapes. Decisions in
// `./decisions.ts` wire the facts + authz providers to the rules below.

export interface TemplateRef {
  generatorId: string
  triggerType: TriggerType
  triggerHoursInterval: number | null
  triggerCalendarDays: number | null
}

export interface RecordRef {
  generatorId: string
  // performedByUserId is consumed by the server-only defence-in-depth
  // "only the owner can delete their record" rule layered on top of the
  // shared check (see `handleMaintenanceRecords`).
  performedByUserId: string
}

export interface UpdateTemplateInput {
  triggerType?: TriggerType
  triggerHoursInterval?: number | null
  triggerCalendarDays?: number | null
}

// Pure maintenance-lifecycle rules. No I/O. Trigger-field merging for
// `updateMaintenanceTemplate` happens in the decision's rule before the
// policy is invoked — the policy gets pre-merged values and only branches
// on them.

export const createMaintenanceTemplatePolicy = (facts: {
  generatorExists: boolean
  isCallerGeneratorOrgAdmin: boolean
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.isCallerGeneratorOrgAdmin)
    return fail('ONLY_ADMIN_CAN_CREATE_TEMPLATES')
  return ok
}

export const updateMaintenanceTemplatePolicy = (facts: {
  templateExists: boolean
  isCallerGeneratorOrgAdmin: boolean
  // `null` means "trigger type is not being changed by this update";
  // companion-field checks are skipped in that case. When present, the
  // merge has already run in the caller (existing row + update payload).
  mergedTriggerType: TriggerType | null
  mergedHours: number | null
  mergedCalendarDays: number | null
}): PolicyResult => {
  if (!facts.templateExists) return fail('TEMPLATE_NOT_FOUND')
  if (!facts.isCallerGeneratorOrgAdmin)
    return fail('ONLY_ADMIN_CAN_UPDATE_TEMPLATES')

  if (facts.mergedTriggerType != null) {
    if (usesHours(facts.mergedTriggerType) && facts.mergedHours == null)
      return fail('HOURS_INTERVAL_REQUIRED')
    if (
      usesCalendar(facts.mergedTriggerType) &&
      facts.mergedCalendarDays == null
    )
      return fail('CALENDAR_DAYS_REQUIRED')
  }

  return ok
}

export const deleteMaintenanceTemplatePolicy = (facts: {
  templateExists: boolean
  isCallerGeneratorOrgAdmin: boolean
}): PolicyResult => {
  if (!facts.templateExists) return fail('TEMPLATE_NOT_FOUND')
  if (!facts.isCallerGeneratorOrgAdmin)
    return fail('ONLY_ADMIN_CAN_DELETE_TEMPLATES')
  return ok
}

export const recordMaintenancePolicy = (facts: {
  generatorExists: boolean
  hasGeneratorAccess: boolean
  templateExists: boolean
  templateGeneratorId: string | null
  requestedGeneratorId: string
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (!facts.templateExists) return fail('MAINTENANCE_TEMPLATE_NOT_FOUND')
  if (facts.templateGeneratorId !== facts.requestedGeneratorId)
    return fail('TEMPLATE_NOT_FOR_GENERATOR')
  return ok
}

export const deleteMaintenanceRecordPolicy = (facts: {
  recordExists: boolean
  hasGeneratorAccess: boolean
}): PolicyResult => {
  if (!facts.recordExists) return fail('RECORD_NOT_FOUND')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  return ok
}

export const updateMaintenanceRecordPolicy = (facts: {
  recordExists: boolean
  hasGeneratorAccess: boolean
  performedAt: string
  now: Date
}): PolicyResult => {
  if (!facts.recordExists) return fail('RECORD_NOT_FOUND')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (new Date(facts.performedAt) > facts.now)
    return fail('PERFORMED_TIME_IN_FUTURE')
  return ok
}
