import type { AuthzChecks } from '@/data/shared/authz'

import { createMaintenanceLifecycleChecks } from '../checks'
import type { MaintenanceFactsProvider, RecordRef, TemplateRef } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts, performs the trigger-field merge, and forwards to the right policy
// function. Full enumeration of policy branches lives in `policy-test.ts`;
// duplicating it here would just add layers to the same assertions against
// the same error codes.

const USER = 'user-1'
const GENERATOR = 'generator-1'
const TEMPLATE = 'template-1'
const RECORD = 'record-1'

const TEMPLATE_REF: TemplateRef = {
  generatorId: GENERATOR,
  triggerType: 'hours',
  triggerHoursInterval: 100,
  triggerCalendarDays: null
}

const RECORD_REF: RecordRef = {
  generatorId: GENERATOR,
  performedByUserId: USER
}

const NOW = new Date('2026-04-11T12:00:00Z')

function makeFacts(
  overrides: Partial<MaintenanceFactsProvider> = {}
): MaintenanceFactsProvider {
  return {
    async generatorExists() {
      return false
    },
    async findTemplate() {
      return null
    },
    async findRecord() {
      return null
    },
    ...overrides
  }
}

function makeAuthz(overrides: Partial<AuthzChecks> = {}): AuthzChecks {
  return {
    async canAccessGenerator() {
      return false
    },
    async isOrgAdmin() {
      return false
    },
    async isGeneratorOrgAdmin() {
      return false
    },
    ...overrides
  }
}

describe('createMaintenanceLifecycleChecks', () => {
  describe('createTemplate', () => {
    it('fetches generatorExists and isGeneratorOrgAdmin in parallel and returns ok', async () => {
      const generatorExists = jest.fn(async () => true)
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ generatorExists }),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(
        await checks.createTemplate(USER, { generatorId: GENERATOR })
      ).toEqual({ ok: true })
      expect(generatorExists).toHaveBeenCalledWith(GENERATOR)
      expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('forwards a missing generator through to the policy as GENERATOR_NOT_FOUND', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return false
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(
        await checks.createTemplate(USER, { generatorId: GENERATOR })
      ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
    })

    it('forwards a non-admin authz result through to the policy', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return true
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return false
          }
        })
      )
      expect(
        await checks.createTemplate(USER, { generatorId: GENERATOR })
      ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_CREATE_TEMPLATES' })
    })
  })

  describe('updateTemplate', () => {
    it('short-circuits TEMPLATE_NOT_FOUND without calling authz', async () => {
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts(),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.updateTemplate(USER, TEMPLATE, {})).toEqual({
        ok: false,
        code: 'TEMPLATE_NOT_FOUND'
      })
      expect(isGeneratorOrgAdmin).not.toHaveBeenCalled()
    })

    it('merges the update onto the existing template and accepts the happy path', async () => {
      const findTemplate = jest.fn(async () => TEMPLATE_REF)
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ findTemplate }),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.updateTemplate(USER, TEMPLATE, {})).toEqual({
        ok: true
      })
      expect(findTemplate).toHaveBeenCalledWith(TEMPLATE)
      expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('skips companion-field validation when triggerType is not being changed', async () => {
      // Existing template has hours=100, days=null. Update touches nothing.
      // If the merge logic leaked companion validation even without a
      // triggerType in the update, this would blow up on days=null.
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return {
              generatorId: GENERATOR,
              triggerType: 'hours',
              triggerHoursInterval: 100,
              triggerCalendarDays: null
            }
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.updateTemplate(USER, TEMPLATE, {})).toEqual({
        ok: true
      })
    })

    it('forwards HOURS_INTERVAL_REQUIRED when switching to "hours" without a value on a template that has null hours', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return {
              generatorId: GENERATOR,
              triggerType: 'calendar',
              triggerHoursInterval: null,
              triggerCalendarDays: 30
            }
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(
        await checks.updateTemplate(USER, TEMPLATE, { triggerType: 'hours' })
      ).toEqual({ ok: false, code: 'HOURS_INTERVAL_REQUIRED' })
    })

    it('merges an explicit triggerHoursInterval from the update onto the existing template', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return {
              generatorId: GENERATOR,
              triggerType: 'calendar',
              triggerHoursInterval: null,
              triggerCalendarDays: 30
            }
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(
        await checks.updateTemplate(USER, TEMPLATE, {
          triggerType: 'hours',
          triggerHoursInterval: 200
        })
      ).toEqual({ ok: true })
    })

    it('treats an explicit `null` triggerCalendarDays as a real value (not "unset")', async () => {
      // Switching to whichever_first with a new hours value but explicitly
      // nulling out calendar days must fail CALENDAR_DAYS_REQUIRED — and
      // must NOT fall back to the existing row's calendar days.
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return {
              generatorId: GENERATOR,
              triggerType: 'calendar',
              triggerHoursInterval: null,
              triggerCalendarDays: 30
            }
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(
        await checks.updateTemplate(USER, TEMPLATE, {
          triggerType: 'whichever_first',
          triggerHoursInterval: 200,
          triggerCalendarDays: null
        })
      ).toEqual({ ok: false, code: 'CALENDAR_DAYS_REQUIRED' })
    })

    it('forwards a non-admin authz result through to the policy', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return TEMPLATE_REF
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.updateTemplate(USER, TEMPLATE, {})).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_UPDATE_TEMPLATES'
      })
    })
  })

  describe('deleteTemplate', () => {
    it('short-circuits TEMPLATE_NOT_FOUND without calling authz', async () => {
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts(),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.deleteTemplate(USER, TEMPLATE)).toEqual({
        ok: false,
        code: 'TEMPLATE_NOT_FOUND'
      })
      expect(isGeneratorOrgAdmin).not.toHaveBeenCalled()
    })

    it('calls authz against the resolved template.generatorId and returns ok', async () => {
      const findTemplate = jest.fn(async () => TEMPLATE_REF)
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ findTemplate }),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.deleteTemplate(USER, TEMPLATE)).toEqual({ ok: true })
      expect(findTemplate).toHaveBeenCalledWith(TEMPLATE)
      expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('forwards a non-admin authz result through to the policy', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findTemplate() {
            return TEMPLATE_REF
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.deleteTemplate(USER, TEMPLATE)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_DELETE_TEMPLATES'
      })
    })
  })

  describe('recordMaintenance', () => {
    it('fetches the three facts concurrently and returns the ok payload', async () => {
      const generatorExists = jest.fn(async () => true)
      const canAccessGenerator = jest.fn(async () => true)
      const findTemplate = jest.fn(async () => TEMPLATE_REF)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ generatorExists, findTemplate }),
        makeAuthz({ canAccessGenerator })
      )
      expect(
        await checks.recordMaintenance(USER, {
          generatorId: GENERATOR,
          templateId: TEMPLATE
        })
      ).toEqual({ ok: true })
      expect(generatorExists).toHaveBeenCalledWith(GENERATOR)
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
      expect(findTemplate).toHaveBeenCalledWith(TEMPLATE)
    })

    it('forwards a missing generator through to the policy as GENERATOR_NOT_FOUND', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return false
          },
          async findTemplate() {
            return TEMPLATE_REF
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return true
          }
        })
      )
      expect(
        await checks.recordMaintenance(USER, {
          generatorId: GENERATOR,
          templateId: TEMPLATE
        })
      ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
    })

    it('forwards no-generator-access through to the policy as NOT_AUTHORIZED_FOR_GENERATOR', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return true
          },
          async findTemplate() {
            return TEMPLATE_REF
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return false
          }
        })
      )
      expect(
        await checks.recordMaintenance(USER, {
          generatorId: GENERATOR,
          templateId: TEMPLATE
        })
      ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
    })

    it('forwards a missing template through to the policy as MAINTENANCE_TEMPLATE_NOT_FOUND', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return true
          },
          async findTemplate() {
            return null
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return true
          }
        })
      )
      expect(
        await checks.recordMaintenance(USER, {
          generatorId: GENERATOR,
          templateId: TEMPLATE
        })
      ).toEqual({ ok: false, code: 'MAINTENANCE_TEMPLATE_NOT_FOUND' })
    })

    it('forwards a template belonging to a different generator through to the policy', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async generatorExists() {
            return true
          },
          async findTemplate() {
            return { ...TEMPLATE_REF, generatorId: 'other-generator' }
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return true
          }
        })
      )
      expect(
        await checks.recordMaintenance(USER, {
          generatorId: GENERATOR,
          templateId: TEMPLATE
        })
      ).toEqual({ ok: false, code: 'TEMPLATE_NOT_FOR_GENERATOR' })
    })
  })

  describe('deleteRecord', () => {
    it('short-circuits RECORD_NOT_FOUND without calling authz', async () => {
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts(),
        makeAuthz({ canAccessGenerator })
      )
      expect(await checks.deleteRecord(USER, RECORD)).toEqual({
        ok: false,
        code: 'RECORD_NOT_FOUND'
      })
      expect(canAccessGenerator).not.toHaveBeenCalled()
    })

    it('returns the fetched record on the success branch so the handler can reuse it', async () => {
      const findRecord = jest.fn(async () => RECORD_REF)
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ findRecord }),
        makeAuthz({ canAccessGenerator })
      )
      expect(await checks.deleteRecord(USER, RECORD)).toEqual({
        ok: true,
        record: RECORD_REF
      })
      expect(findRecord).toHaveBeenCalledWith(RECORD)
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('forwards no-generator-access through to the policy without the record payload', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findRecord() {
            return RECORD_REF
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return false
          }
        })
      )
      expect(await checks.deleteRecord(USER, RECORD)).toEqual({
        ok: false,
        code: 'NOT_AUTHORIZED_FOR_GENERATOR'
      })
    })
  })

  describe('updateRecord', () => {
    it('short-circuits RECORD_NOT_FOUND without calling authz', async () => {
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts(),
        makeAuthz({ canAccessGenerator })
      )
      expect(
        await checks.updateRecord(
          USER,
          RECORD,
          { performedAt: '2026-04-10T12:00:00Z' },
          NOW
        )
      ).toEqual({ ok: false, code: 'RECORD_NOT_FOUND' })
      expect(canAccessGenerator).not.toHaveBeenCalled()
    })

    it('forwards a valid past performedAt through to the policy as ok', async () => {
      const findRecord = jest.fn(async () => RECORD_REF)
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({ findRecord }),
        makeAuthz({ canAccessGenerator })
      )
      expect(
        await checks.updateRecord(
          USER,
          RECORD,
          { performedAt: '2026-04-10T12:00:00Z' },
          NOW
        )
      ).toEqual({ ok: true })
      expect(findRecord).toHaveBeenCalledWith(RECORD)
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('forwards a future performedAt through to the policy as PERFORMED_TIME_IN_FUTURE', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findRecord() {
            return RECORD_REF
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return true
          }
        })
      )
      expect(
        await checks.updateRecord(
          USER,
          RECORD,
          { performedAt: '2026-04-12T12:00:00Z' },
          NOW
        )
      ).toEqual({ ok: false, code: 'PERFORMED_TIME_IN_FUTURE' })
    })

    it('forwards no-generator-access through to the policy as NOT_AUTHORIZED_FOR_GENERATOR', async () => {
      const checks = createMaintenanceLifecycleChecks(
        makeFacts({
          async findRecord() {
            return RECORD_REF
          }
        }),
        makeAuthz({
          async canAccessGenerator() {
            return false
          }
        })
      )
      expect(
        await checks.updateRecord(
          USER,
          RECORD,
          { performedAt: '2026-04-10T12:00:00Z' },
          NOW
        )
      ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
    })
  })
})
