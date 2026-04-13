import type { AuthzChecks } from '@/data/shared/authz'

import {
  createMaintenanceLifecycleChecks,
  createMaintenanceTemplatePolicy,
  deleteMaintenanceRecordPolicy,
  deleteMaintenanceTemplatePolicy,
  recordMaintenancePolicy,
  updateMaintenanceRecordPolicy,
  updateMaintenanceTemplatePolicy,
  type MaintenanceFactsProvider,
  type RecordRef,
  type TemplateRef
} from '..'

const NOW = new Date('2026-04-10T12:00:00.000Z')
const GENERATOR = 'gen-1'
const TEMPLATE = 'tpl-1'
const RECORD = 'rec-1'
const USER = 'user-1'

describe('createMaintenanceTemplatePolicy', () => {
  it('rejects when the generator does not exist', () => {
    expect(
      createMaintenanceTemplatePolicy({
        generatorExists: false,
        isCallerGeneratorOrgAdmin: true
      })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller is not the generator org admin', () => {
    expect(
      createMaintenanceTemplatePolicy({
        generatorExists: true,
        isCallerGeneratorOrgAdmin: false
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_CREATE_TEMPLATES' })
  })

  it('accepts the happy path', () => {
    expect(
      createMaintenanceTemplatePolicy({
        generatorExists: true,
        isCallerGeneratorOrgAdmin: true
      })
    ).toEqual({ ok: true })
  })
})

describe('updateMaintenanceTemplatePolicy', () => {
  const validFacts = {
    templateExists: true,
    isCallerGeneratorOrgAdmin: true,
    mergedTriggerType: null,
    mergedHours: null,
    mergedCalendarDays: null
  }

  it('rejects when the template does not exist', () => {
    expect(
      updateMaintenanceTemplatePolicy({ ...validFacts, templateExists: false })
    ).toEqual({ ok: false, code: 'TEMPLATE_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        isCallerGeneratorOrgAdmin: false
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_UPDATE_TEMPLATES' })
  })

  it('rejects hours trigger type without merged hours interval', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'hours',
        mergedHours: null
      })
    ).toEqual({ ok: false, code: 'HOURS_INTERVAL_REQUIRED' })
  })

  it('rejects calendar trigger type without merged calendar days', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'calendar',
        mergedCalendarDays: null
      })
    ).toEqual({ ok: false, code: 'CALENDAR_DAYS_REQUIRED' })
  })

  it('rejects whichever_first missing hours', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'whichever_first',
        mergedHours: null,
        mergedCalendarDays: 30
      })
    ).toEqual({ ok: false, code: 'HOURS_INTERVAL_REQUIRED' })
  })

  it('rejects whichever_first missing days', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'whichever_first',
        mergedHours: 100,
        mergedCalendarDays: null
      })
    ).toEqual({ ok: false, code: 'CALENDAR_DAYS_REQUIRED' })
  })

  it('accepts whichever_first with both fields set', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'whichever_first',
        mergedHours: 100,
        mergedCalendarDays: 30
      })
    ).toEqual({ ok: true })
  })

  it('accepts an update that does not touch trigger type (companion checks skipped)', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: null,
        mergedHours: null,
        mergedCalendarDays: null
      })
    ).toEqual({ ok: true })
  })

  it('accepts the happy path for hours trigger type', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'hours',
        mergedHours: 100
      })
    ).toEqual({ ok: true })
  })

  it('accepts the happy path for calendar trigger type', () => {
    expect(
      updateMaintenanceTemplatePolicy({
        ...validFacts,
        mergedTriggerType: 'calendar',
        mergedCalendarDays: 30
      })
    ).toEqual({ ok: true })
  })
})

describe('deleteMaintenanceTemplatePolicy', () => {
  it('rejects when the template does not exist', () => {
    expect(
      deleteMaintenanceTemplatePolicy({
        templateExists: false,
        isCallerGeneratorOrgAdmin: true
      })
    ).toEqual({ ok: false, code: 'TEMPLATE_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      deleteMaintenanceTemplatePolicy({
        templateExists: true,
        isCallerGeneratorOrgAdmin: false
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_DELETE_TEMPLATES' })
  })

  it('accepts the happy path', () => {
    expect(
      deleteMaintenanceTemplatePolicy({
        templateExists: true,
        isCallerGeneratorOrgAdmin: true
      })
    ).toEqual({ ok: true })
  })
})

describe('recordMaintenancePolicy', () => {
  const validFacts = {
    generatorExists: true,
    hasGeneratorAccess: true,
    templateExists: true,
    templateGeneratorId: GENERATOR,
    requestedGeneratorId: GENERATOR
  }

  it('rejects when the generator does not exist', () => {
    expect(
      recordMaintenancePolicy({ ...validFacts, generatorExists: false })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller has no generator access', () => {
    expect(
      recordMaintenancePolicy({ ...validFacts, hasGeneratorAccess: false })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('rejects when the template does not exist', () => {
    expect(
      recordMaintenancePolicy({
        ...validFacts,
        templateExists: false,
        templateGeneratorId: null
      })
    ).toEqual({ ok: false, code: 'MAINTENANCE_TEMPLATE_NOT_FOUND' })
  })

  it('rejects when the template belongs to a different generator', () => {
    expect(
      recordMaintenancePolicy({
        ...validFacts,
        templateGeneratorId: 'other-gen'
      })
    ).toEqual({ ok: false, code: 'TEMPLATE_NOT_FOR_GENERATOR' })
  })

  it('accepts the happy path', () => {
    expect(recordMaintenancePolicy(validFacts)).toEqual({ ok: true })
  })
})

describe('deleteMaintenanceRecordPolicy', () => {
  it('rejects when the record does not exist', () => {
    expect(
      deleteMaintenanceRecordPolicy({
        recordExists: false,
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: false, code: 'RECORD_NOT_FOUND' })
  })

  it('rejects when the caller has no generator access', () => {
    expect(
      deleteMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess: false
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('accepts the happy path', () => {
    expect(
      deleteMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: true })
  })
})

describe('updateMaintenanceRecordPolicy', () => {
  const validInput = {
    performedAt: '2026-04-10T10:00:00.000Z'
  }

  it('rejects when the record does not exist', () => {
    expect(
      updateMaintenanceRecordPolicy({
        recordExists: false,
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'RECORD_NOT_FOUND' })
  })

  it('rejects when the caller has no generator access', () => {
    expect(
      updateMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess: false,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('rejects when performedAt is in the future', () => {
    expect(
      updateMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess: true,
        performedAt: '2026-04-10T15:00:00.000Z',
        now: NOW
      })
    ).toEqual({ ok: false, code: 'PERFORMED_TIME_IN_FUTURE' })
  })

  it('accepts the happy path', () => {
    expect(
      updateMaintenanceRecordPolicy({
        recordExists: true,
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: true })
  })
})

// Boundary tests: orchestrator behaviors the pure policies can't express.
// (1) updateTemplate's trigger-field merge treats `undefined` as "unchanged"
// but an explicit `null` as a real clear-to-null. (2) deleteRecord surfaces
// the fetched record on success so handlers can layer additional rules
// without a second round trip.
describe('createMaintenanceLifecycleChecks', () => {
  const TEMPLATE_ROW: TemplateRef = {
    generatorId: GENERATOR,
    triggerType: 'whichever_first',
    triggerHoursInterval: 100,
    triggerCalendarDays: 30
  }
  const RECORD_ROW: RecordRef = {
    generatorId: GENERATOR,
    performedByUserId: USER
  }

  function makeFacts(
    overrides: Partial<MaintenanceFactsProvider> = {}
  ): MaintenanceFactsProvider {
    return {
      async generatorExists() {
        return true
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
        return true
      },
      async isOrgAdmin() {
        return true
      },
      async isGeneratorOrgAdmin() {
        return true
      },
      ...overrides
    }
  }

  it('updateTemplate treats an explicit null triggerCalendarDays as a real value (not "unset")', async () => {
    const facts = makeFacts({
      async findTemplate() {
        return TEMPLATE_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(facts, makeAuthz())
    // User is switching the template to hours-only and clearing calendar
    // days — the merge must forward the explicit null so the policy's
    // companion-field check passes (hours present, days cleared).
    expect(
      await checks.updateTemplate(USER, TEMPLATE, {
        triggerType: 'hours',
        triggerCalendarDays: null
      })
    ).toEqual({ ok: true })
  })

  it('updateTemplate short-circuits to TEMPLATE_NOT_FOUND without calling authz', async () => {
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

  it('updateTemplate with an omitted triggerCalendarDays carries the existing row value into the policy', async () => {
    // Row has hours=100, days=30 under whichever_first. Update supplies a
    // new hours value but omits calendar days entirely — the merge must
    // fall back to the existing row's days so the companion-field check
    // still passes. A regression swapping `undefined` for `null` in the
    // merge would surface as CALENDAR_DAYS_REQUIRED.
    const facts = makeFacts({
      async findTemplate() {
        return TEMPLATE_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(facts, makeAuthz())
    expect(
      await checks.updateTemplate(USER, TEMPLATE, {
        triggerType: 'whichever_first',
        triggerHoursInterval: 200
      })
    ).toEqual({ ok: true })
  })

  it('updateTemplate with only triggerHoursInterval in the payload leaves triggerType untouched (companion checks skipped)', async () => {
    // When the update does not include `triggerType`, the policy sees
    // mergedTriggerType=null and skips companion-field validation entirely
    // — even if the new hours value is e.g. 0 / null. This exercises the
    // orchestrator's "trigger type not being changed" branch.
    const facts = makeFacts({
      async findTemplate() {
        return TEMPLATE_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(facts, makeAuthz())
    expect(
      await checks.updateTemplate(USER, TEMPLATE, {
        triggerHoursInterval: null
      })
    ).toEqual({ ok: true })
  })

  it('updateTemplate with an omitted triggerHoursInterval carries the existing row value into the policy', async () => {
    // Row has whichever_first with hours=100, days=30. If the user changes
    // only the calendar days, the merge must forward the *existing* hours so
    // the companion-field check still passes. A regression that replaced
    // existing hours with `null` would surface as HOURS_INTERVAL_REQUIRED.
    const facts = makeFacts({
      async findTemplate() {
        return TEMPLATE_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(facts, makeAuthz())
    expect(
      await checks.updateTemplate(USER, TEMPLATE, {
        triggerType: 'whichever_first',
        triggerCalendarDays: 60
      })
    ).toEqual({ ok: true })
  })

  it('deleteTemplate short-circuits to TEMPLATE_NOT_FOUND without calling authz', async () => {
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

  it('deleteTemplate authorizes against the template row generatorId (not a caller-supplied value)', async () => {
    const isGeneratorOrgAdmin = jest.fn(async () => true)
    const facts = makeFacts({
      async findTemplate() {
        return TEMPLATE_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(
      facts,
      makeAuthz({ isGeneratorOrgAdmin })
    )
    await checks.deleteTemplate(USER, TEMPLATE)
    expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(
      USER,
      TEMPLATE_ROW.generatorId
    )
  })

  it('deleteRecord short-circuits to RECORD_NOT_FOUND without calling authz', async () => {
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

  it('deleteRecord surfaces the fetched record on the success branch', async () => {
    const facts = makeFacts({
      async findRecord() {
        return RECORD_ROW
      }
    })
    const checks = createMaintenanceLifecycleChecks(facts, makeAuthz())
    expect(await checks.deleteRecord(USER, RECORD)).toEqual({
      ok: true,
      record: RECORD_ROW
    })
  })

  it('updateRecord short-circuits to RECORD_NOT_FOUND without calling authz', async () => {
    const canAccessGenerator = jest.fn(async () => true)
    const checks = createMaintenanceLifecycleChecks(
      makeFacts(),
      makeAuthz({ canAccessGenerator })
    )
    expect(
      await checks.updateRecord(
        USER,
        RECORD,
        { performedAt: '2026-04-10T10:00:00.000Z' },
        NOW
      )
    ).toEqual({ ok: false, code: 'RECORD_NOT_FOUND' })
    expect(canAccessGenerator).not.toHaveBeenCalled()
  })

  it('createTemplate forwards the generator id to both facts and authz probes', async () => {
    const generatorExists = jest.fn(async () => true)
    const isGeneratorOrgAdmin = jest.fn(async () => true)
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({ generatorExists }),
      makeAuthz({ isGeneratorOrgAdmin })
    )
    await checks.createTemplate(USER, { generatorId: GENERATOR })
    expect(generatorExists).toHaveBeenCalledWith(GENERATOR)
    expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
  })

  it('recordMaintenance forwards inputs to all three parallel probes', async () => {
    const generatorExists = jest.fn(async () => true)
    const canAccessGenerator = jest.fn(async () => true)
    const findTemplate = jest.fn(async () => TEMPLATE_ROW)
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

  it('recordMaintenance kicks off all three probes concurrently (Promise.all, not sequential)', async () => {
    // If the orchestrator awaited each probe sequentially, the later probes
    // would not have been invoked before the earlier ones resolved. Using
    // pending promises lets us observe all three start before any settles.
    const order: string[] = []
    let releaseGenerator!: () => void
    let releaseAccess!: () => void
    let releaseTemplate!: () => void
    const generatorExists = jest.fn(
      () =>
        new Promise<boolean>(resolve => {
          order.push('generator')
          releaseGenerator = () => resolve(true)
        })
    )
    const canAccessGenerator = jest.fn(
      () =>
        new Promise<boolean>(resolve => {
          order.push('access')
          releaseAccess = () => resolve(true)
        })
    )
    const findTemplate = jest.fn(
      () =>
        new Promise<TemplateRef | null>(resolve => {
          order.push('template')
          releaseTemplate = () => resolve(TEMPLATE_ROW)
        })
    )
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({ generatorExists, findTemplate }),
      makeAuthz({ canAccessGenerator })
    )
    const pending = checks.recordMaintenance(USER, {
      generatorId: GENERATOR,
      templateId: TEMPLATE
    })
    // Flush microtasks so all three probes get invoked before any resolves.
    await Promise.resolve()
    expect(order).toEqual(['generator', 'access', 'template'])
    expect(generatorExists).toHaveBeenCalledTimes(1)
    expect(canAccessGenerator).toHaveBeenCalledTimes(1)
    expect(findTemplate).toHaveBeenCalledTimes(1)
    releaseGenerator()
    releaseAccess()
    releaseTemplate()
    expect(await pending).toEqual({ ok: true })
  })

  it('createTemplate forwards ONLY_ADMIN_CAN_CREATE_TEMPLATES through the orchestrator', async () => {
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

  it('updateTemplate forwards ONLY_ADMIN_CAN_UPDATE_TEMPLATES through the orchestrator', async () => {
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({
        async findTemplate() {
          return TEMPLATE_ROW
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

  it('deleteTemplate forwards ONLY_ADMIN_CAN_DELETE_TEMPLATES through the orchestrator', async () => {
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({
        async findTemplate() {
          return TEMPLATE_ROW
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

  it('updateRecord forwards NOT_AUTHORIZED_FOR_GENERATOR when canAccessGenerator is false', async () => {
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({
        async findRecord() {
          return RECORD_ROW
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
        { performedAt: '2026-04-10T09:00:00.000Z' },
        NOW
      )
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('updateRecord forwards a future performedAt to the policy as PERFORMED_TIME_IN_FUTURE', async () => {
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({
        async findRecord() {
          return RECORD_ROW
        }
      }),
      makeAuthz()
    )
    expect(
      await checks.updateRecord(
        USER,
        RECORD,
        { performedAt: '2026-04-10T15:00:00.000Z' },
        NOW
      )
    ).toEqual({ ok: false, code: 'PERFORMED_TIME_IN_FUTURE' })
  })

  it('updateRecord happy path routes findRecord(recordId) and canAccessGenerator(userId, record.generatorId)', async () => {
    const findRecord = jest.fn(async () => RECORD_ROW)
    const canAccessGenerator = jest.fn(async () => true)
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({ findRecord }),
      makeAuthz({ canAccessGenerator })
    )
    expect(
      await checks.updateRecord(
        USER,
        RECORD,
        { performedAt: '2026-04-10T09:00:00.000Z' },
        NOW
      )
    ).toEqual({ ok: true })
    expect(findRecord).toHaveBeenCalledWith(RECORD)
    expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
  })

  it('deleteRecord forwards the resolved generatorId (not a caller value) to canAccessGenerator', async () => {
    // The record row's generatorId is what authz sees — not anything the
    // caller supplied. Regressing this would open up cross-generator auth.
    const canAccessGenerator = jest.fn(async () => true)
    const checks = createMaintenanceLifecycleChecks(
      makeFacts({
        async findRecord() {
          return { ...RECORD_ROW, generatorId: 'other-gen' }
        }
      }),
      makeAuthz({ canAccessGenerator })
    )
    await checks.deleteRecord(USER, RECORD)
    expect(canAccessGenerator).toHaveBeenCalledWith(USER, 'other-gen')
  })
})
