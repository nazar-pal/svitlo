import { maintenanceSuggestionSchema } from '@/data/shared/maintenance-suggestion'

function suggestion(tasks: unknown[]) {
  return {
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    tasks,
    sources: ['https://example.com'],
    modelInfo: 'Test',
    isGeneric: false
  }
}

function task(
  type: 'hours' | 'calendar' | 'whichever_first',
  hours: number | null,
  days: number | null
) {
  return {
    taskName: 'Oil change',
    description: 'Change oil',
    triggerType: type,
    triggerHoursInterval: hours,
    triggerCalendarDays: days,
    isOneTime: false
  }
}

describe('maintenanceSuggestionSchema — taskSchema superRefine', () => {
  // ── Valid cases ──────────────────────────────────────────────────────────

  it('accepts hours with triggerHoursInterval set', () => {
    expect(() =>
      maintenanceSuggestionSchema.parse(suggestion([task('hours', 100, null)]))
    ).not.toThrow()
  })

  it('accepts calendar with triggerCalendarDays set', () => {
    expect(() =>
      maintenanceSuggestionSchema.parse(
        suggestion([task('calendar', null, 90)])
      )
    ).not.toThrow()
  })

  it('accepts whichever_first with both fields', () => {
    expect(() =>
      maintenanceSuggestionSchema.parse(
        suggestion([task('whichever_first', 100, 90)])
      )
    ).not.toThrow()
  })

  it('accepts hours with extra days (ignored)', () => {
    expect(() =>
      maintenanceSuggestionSchema.parse(suggestion([task('hours', 100, 90)]))
    ).not.toThrow()
  })

  it('accepts calendar with extra hours (ignored)', () => {
    expect(() =>
      maintenanceSuggestionSchema.parse(suggestion([task('calendar', 100, 90)]))
    ).not.toThrow()
  })

  // ── Invalid cases ────────────────────────────────────────────────────────

  it('rejects hours with null triggerHoursInterval', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('hours', null, null)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 0, 'triggerHoursInterval'])
    }
  })

  it('rejects calendar with null triggerCalendarDays', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('calendar', null, null)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 0, 'triggerCalendarDays'])
    }
  })

  it('rejects whichever_first with null hours', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('whichever_first', null, 90)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 0, 'triggerHoursInterval'])
    }
  })

  it('rejects whichever_first with null days', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('whichever_first', 100, null)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 0, 'triggerCalendarDays'])
    }
  })

  it('rejects whichever_first with both null — two errors', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('whichever_first', null, null)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 0, 'triggerHoursInterval'])
      expect(paths).toContainEqual(['tasks', 0, 'triggerCalendarDays'])
    }
  })

  it('reports correct task index for second task', () => {
    const result = maintenanceSuggestionSchema.safeParse(
      suggestion([task('hours', 100, null), task('calendar', null, null)])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path)
      expect(paths).toContainEqual(['tasks', 1, 'triggerCalendarDays'])
    }
  })
})
