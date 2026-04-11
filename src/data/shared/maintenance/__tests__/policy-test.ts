import {
  createMaintenanceTemplatePolicy,
  deleteMaintenanceRecordPolicy,
  deleteMaintenanceTemplatePolicy,
  recordMaintenancePolicy,
  updateMaintenanceRecordPolicy,
  updateMaintenanceTemplatePolicy
} from '../policy'

const NOW = new Date('2026-04-10T12:00:00.000Z')
const GENERATOR = 'gen-1'

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
