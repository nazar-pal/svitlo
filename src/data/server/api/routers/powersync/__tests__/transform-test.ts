import {
  generatorSessions,
  maintenanceRecords,
  maintenanceTemplates,
  user
} from '@/data/server/db-schema'

import { transformSyncRow } from '../transform'

describe('transformSyncRow', () => {
  it('converts snake_case keys to camelCase using the table metadata', () => {
    const result = transformSyncRow(maintenanceRecords, {
      template_id: 'tpl-1',
      generator_id: 'gen-1',
      notes: 'rotated oil'
    })
    expect(result).toEqual({
      templateId: 'tpl-1',
      generatorId: 'gen-1',
      notes: 'rotated oil'
    })
  })

  it('strips the id field', () => {
    const result = transformSyncRow(maintenanceRecords, {
      id: 'abc',
      notes: 'x'
    })
    expect(result).toEqual({ notes: 'x' })
  })

  it('drops keys that are not columns on the given table', () => {
    const result = transformSyncRow(maintenanceRecords, {
      notes: 'kept',
      some_unknown_field: 'dropped',
      another_garbage_key: 42
    })
    expect(result).toEqual({ notes: 'kept' })
  })

  it('converts timestamp columns to Date objects', () => {
    const result = transformSyncRow(generatorSessions, {
      started_at: '2024-06-15T12:00:00Z',
      stopped_at: '2024-06-15T14:00:00Z'
    })
    expect(result).toEqual({
      startedAt: new Date('2024-06-15T12:00:00Z'),
      stoppedAt: new Date('2024-06-15T14:00:00Z')
    })
  })

  it('converts boolean columns from SQLite integer/string representations', () => {
    expect(
      transformSyncRow(maintenanceTemplates, { is_one_time: '1' })
    ).toEqual({ isOneTime: true })
    expect(transformSyncRow(maintenanceTemplates, { is_one_time: 1 })).toEqual({
      isOneTime: true
    })
    expect(
      transformSyncRow(maintenanceTemplates, { is_one_time: true })
    ).toEqual({ isOneTime: true })
    expect(
      transformSyncRow(maintenanceTemplates, { is_one_time: '0' })
    ).toEqual({ isOneTime: false })
    expect(transformSyncRow(maintenanceTemplates, { is_one_time: 0 })).toEqual({
      isOneTime: false
    })
    expect(
      transformSyncRow(maintenanceTemplates, { is_one_time: false })
    ).toEqual({ isOneTime: false })
  })

  it('converts number columns from string representations', () => {
    const result = transformSyncRow(maintenanceTemplates, {
      trigger_hours_interval: '100',
      trigger_calendar_days: '30'
    })
    expect(result).toEqual({
      triggerHoursInterval: 100,
      triggerCalendarDays: 30
    })
  })

  it('passes through number columns already numeric', () => {
    const result = transformSyncRow(maintenanceTemplates, {
      trigger_hours_interval: 8,
      trigger_calendar_days: 30
    })
    expect(result).toEqual({
      triggerHoursInterval: 8,
      triggerCalendarDays: 30
    })
  })

  it('converts user.email_verified (boolean) for the user table', () => {
    expect(transformSyncRow(user, { email_verified: '1' })).toEqual({
      emailVerified: true
    })
    expect(transformSyncRow(user, { email_verified: 0 })).toEqual({
      emailVerified: false
    })
  })

  it('converts null values to null across all column types', () => {
    const result = transformSyncRow(maintenanceTemplates, {
      created_at: null,
      is_one_time: null,
      trigger_hours_interval: null,
      task_name: null
    })
    expect(result).toEqual({
      createdAt: null,
      isOneTime: null,
      triggerHoursInterval: null,
      taskName: null
    })
  })

  it('converts undefined values to null', () => {
    const result = transformSyncRow(generatorSessions, {
      stopped_at: undefined
    })
    expect(result).toEqual({ stoppedAt: null })
  })

  it('passes through plain string columns unchanged', () => {
    const result = transformSyncRow(maintenanceTemplates, {
      task_name: 'Oil change',
      description: 'every 100 hours'
    })
    expect(result).toEqual({
      taskName: 'Oil change',
      description: 'every 100 hours'
    })
  })

  it('returns an empty object when only id is provided', () => {
    expect(transformSyncRow(maintenanceRecords, { id: 'abc' })).toEqual({})
  })

  it('returns an empty object for empty input', () => {
    expect(transformSyncRow(maintenanceRecords, {})).toEqual({})
  })

  it('coerces per-table — same column name on different tables resolves to each table independently', () => {
    // `generator_id` exists on both maintenance_records and maintenance_templates
    // and should map to `generatorId` on each, driven by that table's own
    // metadata rather than a shared global registry.
    const recordResult = transformSyncRow(maintenanceRecords, {
      generator_id: 'gen-1',
      performed_at: '2024-06-15T10:00:00Z'
    })
    const templateResult = transformSyncRow(maintenanceTemplates, {
      generator_id: 'gen-2',
      created_at: '2024-06-16T10:00:00Z'
    })
    expect(recordResult).toEqual({
      generatorId: 'gen-1',
      performedAt: new Date('2024-06-15T10:00:00Z')
    })
    expect(templateResult).toEqual({
      generatorId: 'gen-2',
      createdAt: new Date('2024-06-16T10:00:00Z')
    })
  })

  it('handles a realistic PowerSync upload payload for maintenance_templates', () => {
    const result = transformSyncRow(maintenanceTemplates, {
      id: 'tpl-1',
      generator_id: 'gen-1',
      task_name: 'Oil Change',
      trigger_type: 'whichever_first',
      trigger_hours_interval: '100',
      trigger_calendar_days: '180',
      is_one_time: '0',
      created_at: '2024-06-15T10:00:00Z'
    })
    expect(result).toEqual({
      generatorId: 'gen-1',
      taskName: 'Oil Change',
      triggerType: 'whichever_first',
      triggerHoursInterval: 100,
      triggerCalendarDays: 180,
      isOneTime: false,
      createdAt: new Date('2024-06-15T10:00:00Z')
    })
  })
})
