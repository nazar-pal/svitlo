import { transformSyncData } from '../transform'

describe('schema-derived type coercion', () => {
  it('converts schema-derived timestamp fields to Date objects', () => {
    const result = transformSyncData({
      expires_at: '2024-09-01T00:00:00Z',
      access_token_expires_at: '2024-09-02T00:00:00Z'
    })
    expect(result).toEqual({
      expiresAt: new Date('2024-09-01T00:00:00Z'),
      accessTokenExpiresAt: new Date('2024-09-02T00:00:00Z')
    })
  })

  it('converts schema-derived boolean fields from SQLite representations', () => {
    expect(transformSyncData({ email_verified: '1' })).toEqual({
      emailVerified: true
    })
    expect(transformSyncData({ email_verified: 0 })).toEqual({
      emailVerified: false
    })
  })
})

describe('transformSyncData', () => {
  it('converts snake_case keys to camelCase', () => {
    const result = transformSyncData({
      organization_id: 'org-1',
      some_field: 'x'
    })
    expect(result).toEqual({ organizationId: 'org-1', someField: 'x' })
  })

  it('strips the id field', () => {
    const result = transformSyncData({ id: 'abc', name: 'Test' })
    expect(result).toEqual({ name: 'Test' })
  })

  it('converts timestamp fields to Date objects', () => {
    const result = transformSyncData({
      created_at: '2024-06-15T10:30:00Z',
      started_at: '2024-06-15T12:00:00Z',
      stopped_at: '2024-06-15T14:00:00Z',
      joined_at: '2024-01-01T00:00:00Z',
      assigned_at: '2024-03-10T08:00:00Z',
      performed_at: '2024-04-20T16:00:00Z',
      updated_at: '2024-05-01T12:00:00Z'
    })
    expect(result).toEqual({
      createdAt: new Date('2024-06-15T10:30:00Z'),
      startedAt: new Date('2024-06-15T12:00:00Z'),
      stoppedAt: new Date('2024-06-15T14:00:00Z'),
      joinedAt: new Date('2024-01-01T00:00:00Z'),
      assignedAt: new Date('2024-03-10T08:00:00Z'),
      performedAt: new Date('2024-04-20T16:00:00Z'),
      updatedAt: new Date('2024-05-01T12:00:00Z')
    })
  })

  it('converts boolean fields from SQLite integer/string representations', () => {
    expect(transformSyncData({ is_one_time: '1' })).toEqual({ isOneTime: true })
    expect(transformSyncData({ is_one_time: 1 })).toEqual({ isOneTime: true })
    expect(transformSyncData({ is_one_time: true })).toEqual({
      isOneTime: true
    })
    expect(transformSyncData({ is_one_time: '0' })).toEqual({
      isOneTime: false
    })
    expect(transformSyncData({ is_one_time: 0 })).toEqual({ isOneTime: false })
    expect(transformSyncData({ is_one_time: false })).toEqual({
      isOneTime: false
    })
  })

  it('converts number fields from string representations', () => {
    const result = transformSyncData({
      max_consecutive_run_hours: '8',
      required_rest_hours: '4',
      run_warning_threshold_pct: '80',
      trigger_hours_interval: '100',
      trigger_calendar_days: '30'
    })
    expect(result).toEqual({
      maxConsecutiveRunHours: 8,
      requiredRestHours: 4,
      runWarningThresholdPct: 80,
      triggerHoursInterval: 100,
      triggerCalendarDays: 30
    })
  })

  it('passes through number fields that are already numbers', () => {
    const result = transformSyncData({
      max_consecutive_run_hours: 8,
      trigger_calendar_days: 30
    })
    expect(result).toEqual({
      maxConsecutiveRunHours: 8,
      triggerCalendarDays: 30
    })
  })

  it('converts null values to null for all field types', () => {
    const result = transformSyncData({
      created_at: null,
      is_one_time: null,
      max_consecutive_run_hours: null,
      name: null
    })
    expect(result).toEqual({
      createdAt: null,
      isOneTime: null,
      maxConsecutiveRunHours: null,
      name: null
    })
  })

  it('converts undefined values to null', () => {
    const result = transformSyncData({ stopped_at: undefined })
    expect(result).toEqual({ stoppedAt: null })
  })

  it('passes through plain string fields unchanged', () => {
    const result = transformSyncData({
      name: 'Generator A',
      notes: 'some notes'
    })
    expect(result).toEqual({ name: 'Generator A', notes: 'some notes' })
  })

  it('returns empty object for input with only id', () => {
    expect(transformSyncData({ id: 'abc' })).toEqual({})
  })

  it('returns empty object for empty input', () => {
    expect(transformSyncData({})).toEqual({})
  })

  it('handles a realistic PowerSync upload payload', () => {
    const result = transformSyncData({
      id: 'maint-1',
      generator_id: 'gen-1',
      name: 'Oil Change',
      trigger_type: 'whichever_first',
      trigger_hours_interval: '100',
      trigger_calendar_days: '180',
      is_one_time: '0',
      created_at: '2024-06-15T10:00:00Z',
      updated_at: '2024-06-15T10:00:00Z'
    })
    expect(result).toEqual({
      generatorId: 'gen-1',
      name: 'Oil Change',
      triggerType: 'whichever_first',
      triggerHoursInterval: 100,
      triggerCalendarDays: 180,
      isOneTime: false,
      createdAt: new Date('2024-06-15T10:00:00Z'),
      updatedAt: new Date('2024-06-15T10:00:00Z')
    })
  })
})
