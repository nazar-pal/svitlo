import type { AuthzChecks } from '@/data/shared/authz'
import type { TriggerType } from '@/lib/maintenance/trigger-type'

import type { MaintenanceFactsProvider, RecordRef } from './facts'
import * as policy from './policy'
import type { PolicyResult } from './policy'

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
      return policy.createMaintenanceTemplatePolicy({
        generatorExists,
        isCallerGeneratorOrgAdmin
      })
    },

    async updateTemplate(userId, templateId, update) {
      const template = await facts.findTemplate(templateId)
      if (!template)
        return policy.updateMaintenanceTemplatePolicy({
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

      return policy.updateMaintenanceTemplatePolicy({
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
      return policy.deleteMaintenanceTemplatePolicy({
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
      return policy.recordMaintenancePolicy({
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
      // without a cast — same pattern as `deleteSession` in sessions/checks.
      if (!record) return { ok: false, code: 'RECORD_NOT_FOUND' }
      const hasGeneratorAccess = await authz.canAccessGenerator(
        userId,
        record.generatorId
      )
      const result = policy.deleteMaintenanceRecordPolicy({
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
      return policy.updateMaintenanceRecordPolicy({
        recordExists: record !== null,
        hasGeneratorAccess,
        performedAt: input.performedAt,
        now
      })
    }
  }
}
