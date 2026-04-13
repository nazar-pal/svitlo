import type { AuthzChecks } from '@/data/shared/authz'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'
import type { TriggerType } from '@/lib/maintenance/trigger-type'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the maintenance-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

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

// --- Pure policy rules ---

// Pure maintenance-lifecycle rules. No I/O. Callers fetch facts, then ask
// the policy. Both client (PowerSync SQLite) and server (Postgres) reuse
// these so the rules live in exactly one place.
//
// Trigger-field merging for `updateMaintenanceTemplate` happens in the
// caller (orchestrator below) — the policy gets pre-merged values and only
// branches on them. Same design as `updateSessionPolicy` taking a
// pre-computed `now`.

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
    const needsHours =
      facts.mergedTriggerType === 'hours' ||
      facts.mergedTriggerType === 'whichever_first'
    const needsDays =
      facts.mergedTriggerType === 'calendar' ||
      facts.mergedTriggerType === 'whichever_first'

    if (needsHours && facts.mergedHours == null)
      return fail('HOURS_INTERVAL_REQUIRED')
    if (needsDays && facts.mergedCalendarDays == null)
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

export const updateMaintenanceRecordPolicy = (params: {
  recordExists: boolean
  hasGeneratorAccess: boolean
  performedAt: string
  now: Date
}): PolicyResult => {
  if (!params.recordExists) return fail('RECORD_NOT_FOUND')
  if (!params.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (new Date(params.performedAt) > params.now)
    return fail('PERFORMED_TIME_IN_FUTURE')
  return ok
}

// --- Lifecycle orchestrator — wires facts + authz → policy ---

// Delete-record is the only check that surfaces the fetched record on
// success. The server handler needs it for a defence-in-depth ownership
// rule layered on top of the shared policy; returning it here means that
// rule runs against the same `findRecord` result the policy already
// consumed, instead of paying for a second round trip.
export type DeleteMaintenanceRecordResult =
  | { ok: true; record: RecordRef }
  | Exclude<PolicyResult, { ok: true }>

export interface UpdateTemplateInput {
  triggerType?: TriggerType
  triggerHoursInterval?: number | null
  triggerCalendarDays?: number | null
}

export interface MaintenanceLifecycleChecks {
  createTemplate(
    userId: string,
    input: { generatorId: string }
  ): Promise<PolicyResult>
  updateTemplate(
    userId: string,
    templateId: string,
    update: UpdateTemplateInput
  ): Promise<PolicyResult>
  deleteTemplate(userId: string, templateId: string): Promise<PolicyResult>
  recordMaintenance(
    userId: string,
    input: { generatorId: string; templateId: string }
  ): Promise<PolicyResult>
  deleteRecord(
    userId: string,
    recordId: string
  ): Promise<DeleteMaintenanceRecordResult>
  updateRecord(
    userId: string,
    recordId: string,
    input: { performedAt: string },
    now: Date
  ): Promise<PolicyResult>
}

// Single source of truth for maintenance-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createMaintenanceLifecycleChecks(
  facts: MaintenanceFactsProvider,
  authz: AuthzChecks
): MaintenanceLifecycleChecks {
  return {
    async createTemplate(userId, input) {
      const [generatorExists, isCallerGeneratorOrgAdmin] = await Promise.all([
        facts.generatorExists(input.generatorId),
        authz.isGeneratorOrgAdmin(userId, input.generatorId)
      ])
      return createMaintenanceTemplatePolicy({
        generatorExists,
        isCallerGeneratorOrgAdmin
      })
    },

    async updateTemplate(userId, templateId, update) {
      const template = await facts.findTemplate(templateId)
      if (!template)
        return updateMaintenanceTemplatePolicy({
          templateExists: false,
          isCallerGeneratorOrgAdmin: false,
          mergedTriggerType: null,
          mergedHours: null,
          mergedCalendarDays: null
        })

      const isCallerGeneratorOrgAdmin = await authz.isGeneratorOrgAdmin(
        userId,
        template.generatorId
      )

      // Trigger-field merging lives here, not in the policy. If the update
      // does not touch `triggerType`, the policy short-circuits the
      // companion-field branches via `mergedTriggerType = null` — same
      // semantics as the old inline `if (parsed.data.triggerType)` guard.
      const mergedTriggerType = update.triggerType ?? null
      const mergedHours =
        update.triggerHoursInterval !== undefined
          ? update.triggerHoursInterval
          : template.triggerHoursInterval
      const mergedCalendarDays =
        update.triggerCalendarDays !== undefined
          ? update.triggerCalendarDays
          : template.triggerCalendarDays

      return updateMaintenanceTemplatePolicy({
        templateExists: true,
        isCallerGeneratorOrgAdmin,
        mergedTriggerType,
        mergedHours,
        mergedCalendarDays
      })
    },

    async deleteTemplate(userId, templateId) {
      const template = await facts.findTemplate(templateId)
      const isCallerGeneratorOrgAdmin = template
        ? await authz.isGeneratorOrgAdmin(userId, template.generatorId)
        : false
      return deleteMaintenanceTemplatePolicy({
        templateExists: template !== null,
        isCallerGeneratorOrgAdmin
      })
    },

    async recordMaintenance(userId, input) {
      const [generatorExists, hasGeneratorAccess, template] = await Promise.all(
        [
          facts.generatorExists(input.generatorId),
          authz.canAccessGenerator(userId, input.generatorId),
          facts.findTemplate(input.templateId)
        ]
      )
      return recordMaintenancePolicy({
        generatorExists,
        hasGeneratorAccess,
        templateExists: template !== null,
        templateGeneratorId: template?.generatorId ?? null,
        requestedGeneratorId: input.generatorId
      })
    },

    async deleteRecord(userId, recordId) {
      const record = await facts.findRecord(recordId)
      // Narrow here so the success branch can return `record` as non-null
      // without a cast — same pattern as `deleteSession` in sessions.
      if (!record) return { ok: false, code: 'RECORD_NOT_FOUND' }
      const hasGeneratorAccess = await authz.canAccessGenerator(
        userId,
        record.generatorId
      )
      const result = deleteMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess
      })
      if (!result.ok) return result
      return { ok: true, record }
    },

    async updateRecord(userId, recordId, input, now) {
      const record = await facts.findRecord(recordId)
      const hasGeneratorAccess = record
        ? await authz.canAccessGenerator(userId, record.generatorId)
        : false
      return updateMaintenanceRecordPolicy({
        recordExists: record !== null,
        hasGeneratorAccess,
        performedAt: input.performedAt,
        now
      })
    }
  }
}
