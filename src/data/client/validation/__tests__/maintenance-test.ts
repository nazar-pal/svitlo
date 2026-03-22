import {
  insertMaintenanceTemplateSchema,
  updateMaintenanceTemplateSchema,
  insertMaintenanceRecordSchema
} from '../maintenance'

function validHoursTemplate() {
  return {
    generatorId: 'gen-1',
    taskName: 'Oil change',
    triggerType: 'hours' as const,
    triggerHoursInterval: 100
  }
}

function validCalendarTemplate() {
  return {
    generatorId: 'gen-1',
    taskName: 'Air filter',
    triggerType: 'calendar' as const,
    triggerCalendarDays: 90
  }
}

function validWhicheverFirstTemplate() {
  return {
    generatorId: 'gen-1',
    taskName: 'Spark plug',
    triggerType: 'whichever_first' as const,
    triggerHoursInterval: 200,
    triggerCalendarDays: 365
  }
}

describe('insertMaintenanceTemplateSchema', () => {
  it('accepts valid hours trigger', () => {
    const result =
      insertMaintenanceTemplateSchema.safeParse(validHoursTemplate())
    expect(result.success).toBe(true)
  })

  it('accepts valid calendar trigger', () => {
    const result = insertMaintenanceTemplateSchema.safeParse(
      validCalendarTemplate()
    )
    expect(result.success).toBe(true)
  })

  it('accepts valid whichever_first trigger', () => {
    const result = insertMaintenanceTemplateSchema.safeParse(
      validWhicheverFirstTemplate()
    )
    expect(result.success).toBe(true)
  })

  it('rejects hours trigger without triggerHoursInterval', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      generatorId: 'gen-1',
      taskName: 'Oil change',
      triggerType: 'hours'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerHoursInterval')
    }
  })

  it('rejects calendar trigger without triggerCalendarDays', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      generatorId: 'gen-1',
      taskName: 'Air filter',
      triggerType: 'calendar'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerCalendarDays')
    }
  })

  it('rejects whichever_first missing triggerHoursInterval', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      generatorId: 'gen-1',
      taskName: 'Spark plug',
      triggerType: 'whichever_first',
      triggerCalendarDays: 365
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerHoursInterval')
    }
  })

  it('rejects whichever_first missing triggerCalendarDays', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      generatorId: 'gen-1',
      taskName: 'Spark plug',
      triggerType: 'whichever_first',
      triggerHoursInterval: 200
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerCalendarDays')
    }
  })

  it('rejects whichever_first missing both intervals', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      generatorId: 'gen-1',
      taskName: 'Spark plug',
      triggerType: 'whichever_first'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerHoursInterval')
      expect(paths).toContain('triggerCalendarDays')
    }
  })

  it('rejects empty taskName', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      ...validHoursTemplate(),
      taskName: ''
    })
    expect(result.success).toBe(false)
  })

  it('defaults isOneTime to false', () => {
    const result =
      insertMaintenanceTemplateSchema.safeParse(validHoursTemplate())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isOneTime).toBe(false)
  })

  it('accepts isOneTime as true', () => {
    const result = insertMaintenanceTemplateSchema.safeParse({
      ...validHoursTemplate(),
      isOneTime: true
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isOneTime).toBe(true)
  })
})

describe('updateMaintenanceTemplateSchema', () => {
  it('accepts partial update with single field', () => {
    const result = updateMaintenanceTemplateSchema.safeParse({
      taskName: 'New name'
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty object (at least one field required)', () => {
    const result = updateMaintenanceTemplateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('validates trigger fields when triggerType is provided', () => {
    const result = updateMaintenanceTemplateSchema.safeParse({
      triggerType: 'hours'
      // triggerHoursInterval missing — should fail superRefine
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('triggerHoursInterval')
    }
  })
})

describe('insertMaintenanceRecordSchema', () => {
  it('accepts valid input', () => {
    const result = insertMaintenanceRecordSchema.safeParse({
      templateId: 'tmpl-1',
      generatorId: 'gen-1'
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional notes and performedAt', () => {
    const result = insertMaintenanceRecordSchema.safeParse({
      templateId: 'tmpl-1',
      generatorId: 'gen-1',
      performedAt: '2026-01-15T12:00:00Z',
      notes: 'Changed oil filter too'
    })
    expect(result.success).toBe(true)
  })
})
