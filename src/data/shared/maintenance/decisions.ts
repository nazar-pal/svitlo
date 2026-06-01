import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'
import type { TriggerType } from '@/lib/maintenance/trigger-type'

import {
  createMaintenanceTemplatePolicy,
  deleteMaintenanceRecordPolicy,
  deleteMaintenanceTemplatePolicy,
  recordMaintenancePolicy,
  updateMaintenanceRecordPolicy,
  updateMaintenanceTemplatePolicy,
  type PolicyResult,
  type RecordRef,
  type TemplateRef,
  type UpdateTemplateInput
} from './index'

type GeneratorAuthzFact = {
  orgAdminUserId: string | null
  hasAssignment: boolean
} | null

// ── createTemplate ──────────────────────────────────────────────────────────

export interface CreateTemplateArgs {
  userId: string
  generatorId: string
}

interface CreateTemplateFacts {
  generatorExists: boolean
  authzGenerator: GeneratorAuthzFact
}

const createTemplatePlan = factPlanFor<
  CreateTemplateArgs,
  CreateTemplateFacts
>()

export const createTemplate = defineDecision<
  CreateTemplateArgs,
  CreateTemplateFacts,
  PolicyResult
>({
  id: 'maintenance.createTemplate',
  plan: [
    createTemplatePlan(
      'generatorExists',
      'generator.exists',
      a => a.generatorId
    ),
    createTemplatePlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) =>
    createMaintenanceTemplatePolicy({
      generatorExists: facts.generatorExists ?? false,
      isCallerGeneratorOrgAdmin: authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null
      )
    })
})

// ── updateTemplate ──────────────────────────────────────────────────────────

export interface UpdateTemplateArgs {
  userId: string
  templateId: string
  update: UpdateTemplateInput
}

interface UpdateTemplateFacts {
  template: TemplateRef | null
  authzGenerator: GeneratorAuthzFact
}

const updateTemplatePlan = factPlanFor<
  UpdateTemplateArgs,
  UpdateTemplateFacts
>()

export const updateTemplate = defineDecision<
  UpdateTemplateArgs,
  UpdateTemplateFacts,
  PolicyResult
>({
  id: 'maintenance.updateTemplate',
  plan: [
    updateTemplatePlan(
      'template',
      'maintenanceTemplate.byId',
      a => a.templateId
    ),
    updateTemplatePlan('authzGenerator', 'authz.generator', (a, f) =>
      f.template
        ? { userId: a.userId, generatorId: f.template.generatorId }
        : null
    )
  ],
  rule: (args, facts) => {
    const template = facts.template
    if (!template)
      return updateMaintenanceTemplatePolicy({
        templateExists: false,
        isCallerGeneratorOrgAdmin: false,
        mergedTriggerType: null,
        mergedHours: null,
        mergedCalendarDays: null
      })
    // Trigger-field merging lives here, not in the pure policy. If the
    // update doesn't touch `triggerType`, the policy short-circuits the
    // companion-field branches via `mergedTriggerType = null`.
    const mergedTriggerType: TriggerType | null =
      args.update.triggerType ?? null
    const mergedHours =
      args.update.triggerHoursInterval !== undefined
        ? args.update.triggerHoursInterval
        : template.triggerHoursInterval
    const mergedCalendarDays =
      args.update.triggerCalendarDays !== undefined
        ? args.update.triggerCalendarDays
        : template.triggerCalendarDays
    return updateMaintenanceTemplatePolicy({
      templateExists: true,
      isCallerGeneratorOrgAdmin: authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null
      ),
      mergedTriggerType,
      mergedHours,
      mergedCalendarDays
    })
  }
})

// ── deleteTemplate ──────────────────────────────────────────────────────────

export interface DeleteTemplateArgs {
  userId: string
  templateId: string
}

interface DeleteTemplateFacts {
  template: TemplateRef | null
  authzGenerator: GeneratorAuthzFact
}

const deleteTemplatePlan = factPlanFor<
  DeleteTemplateArgs,
  DeleteTemplateFacts
>()

export const deleteTemplate = defineDecision<
  DeleteTemplateArgs,
  DeleteTemplateFacts,
  PolicyResult
>({
  id: 'maintenance.deleteTemplate',
  plan: [
    deleteTemplatePlan(
      'template',
      'maintenanceTemplate.byId',
      a => a.templateId
    ),
    deleteTemplatePlan('authzGenerator', 'authz.generator', (a, f) =>
      f.template
        ? { userId: a.userId, generatorId: f.template.generatorId }
        : null
    )
  ],
  rule: (args, facts) =>
    deleteMaintenanceTemplatePolicy({
      templateExists: facts.template !== null,
      isCallerGeneratorOrgAdmin: authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null
      )
    })
})

// ── recordMaintenance ───────────────────────────────────────────────────────

export interface RecordMaintenanceArgs {
  userId: string
  generatorId: string
  templateId: string
}

interface RecordMaintenanceFacts {
  generatorExists: boolean
  authzGenerator: GeneratorAuthzFact
  template: TemplateRef | null
}

const recordMaintenancePlan = factPlanFor<
  RecordMaintenanceArgs,
  RecordMaintenanceFacts
>()

export const recordMaintenance = defineDecision<
  RecordMaintenanceArgs,
  RecordMaintenanceFacts,
  PolicyResult
>({
  id: 'maintenance.recordMaintenance',
  plan: [
    recordMaintenancePlan(
      'generatorExists',
      'generator.exists',
      a => a.generatorId
    ),
    recordMaintenancePlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    })),
    recordMaintenancePlan(
      'template',
      'maintenanceTemplate.byId',
      a => a.templateId
    )
  ],
  rule: (args, facts) =>
    recordMaintenancePolicy({
      generatorExists: facts.generatorExists ?? false,
      hasGeneratorAccess: authzPolicy.canAccessGenerator(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null,
        facts.authzGenerator?.hasAssignment ?? false
      ),
      templateExists: facts.template !== null,
      templateGeneratorId: facts.template?.generatorId ?? null,
      requestedGeneratorId: args.generatorId
    })
})

// ── deleteRecord ────────────────────────────────────────────────────────────

export interface DeleteRecordArgs {
  userId: string
  recordId: string
}

interface DeleteRecordFacts {
  record: RecordRef | null
  authzGenerator: GeneratorAuthzFact
}

const deleteRecordPlan = factPlanFor<DeleteRecordArgs, DeleteRecordFacts>()

export const deleteRecord = defineDecision<
  DeleteRecordArgs,
  DeleteRecordFacts,
  PolicyResult
>({
  id: 'maintenance.deleteRecord',
  plan: [
    deleteRecordPlan('record', 'maintenanceRecord.byId', a => a.recordId),
    deleteRecordPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.record ? { userId: a.userId, generatorId: f.record.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    deleteMaintenanceRecordPolicy({
      recordExists: facts.record !== null,
      hasGeneratorAccess: authzPolicy.canAccessGenerator(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null,
        facts.authzGenerator?.hasAssignment ?? false
      )
    })
})

// ── updateRecord ────────────────────────────────────────────────────────────

export interface UpdateRecordArgs {
  userId: string
  recordId: string
  performedAt: string
  now: Date
}

interface UpdateRecordFacts {
  record: RecordRef | null
  authzGenerator: GeneratorAuthzFact
}

const updateRecordPlan = factPlanFor<UpdateRecordArgs, UpdateRecordFacts>()

export const updateRecord = defineDecision<
  UpdateRecordArgs,
  UpdateRecordFacts,
  PolicyResult
>({
  id: 'maintenance.updateRecord',
  plan: [
    updateRecordPlan('record', 'maintenanceRecord.byId', a => a.recordId),
    updateRecordPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.record ? { userId: a.userId, generatorId: f.record.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    updateMaintenanceRecordPolicy({
      recordExists: facts.record !== null,
      hasGeneratorAccess: authzPolicy.canAccessGenerator(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null,
        facts.authzGenerator?.hasAssignment ?? false
      ),
      performedAt: args.performedAt,
      now: args.now
    })
})
