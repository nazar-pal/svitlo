jest.mock('../../orpc', () => ({
  protectedProcedure: {
    input: () => ({ output: () => ({ handler: () => ({}) }) })
  }
}))

jest.mock('@/data/server/ai/maintenance-agent', () => ({}))

import {
  repairTasks,
  genericFallback,
  DEFAULT_CALENDAR_DAYS,
  ASSUMED_DAILY_HOURS
} from '../ai'

function task(
  triggerType: 'hours' | 'calendar' | 'whichever_first',
  hours: number | null,
  days: number | null
) {
  return {
    taskName: 'Test task',
    description: 'A test task',
    triggerType,
    triggerHoursInterval: hours,
    triggerCalendarDays: days,
    isOneTime: false
  }
}

describe('repairTasks', () => {
  describe('hours trigger type', () => {
    it('returns unchanged when triggerHoursInterval is present', () => {
      const input = [task('hours', 100, null)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('hours')
      expect(result[0].triggerHoursInterval).toBe(100)
    })

    it('converts to calendar when triggerHoursInterval is missing', () => {
      const input = [task('hours', null, null)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('calendar')
      expect(result[0].triggerCalendarDays).toBe(DEFAULT_CALENDAR_DAYS)
      expect(result[0].triggerHoursInterval).toBeNull()
    })
  })

  describe('calendar trigger type', () => {
    it('returns unchanged when triggerCalendarDays is present', () => {
      const input = [task('calendar', null, 180)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('calendar')
      expect(result[0].triggerCalendarDays).toBe(180)
    })

    it('adds default days when triggerCalendarDays is missing', () => {
      const input = [task('calendar', null, null)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('calendar')
      expect(result[0].triggerCalendarDays).toBe(DEFAULT_CALENDAR_DAYS)
    })
  })

  describe('whichever_first trigger type', () => {
    it('returns unchanged when both fields present', () => {
      const input = [task('whichever_first', 100, 180)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('whichever_first')
      expect(result[0].triggerHoursInterval).toBe(100)
      expect(result[0].triggerCalendarDays).toBe(180)
    })

    it('computes days from hours when only hours provided', () => {
      const input = [task('whichever_first', 100, null)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('whichever_first')
      expect(result[0].triggerHoursInterval).toBe(100)
      expect(result[0].triggerCalendarDays).toBe(
        Math.ceil(100 / ASSUMED_DAILY_HOURS)
      )
    })

    it('computes hours from days when only days provided', () => {
      const input = [task('whichever_first', null, 30)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('whichever_first')
      expect(result[0].triggerCalendarDays).toBe(30)
      expect(result[0].triggerHoursInterval).toBe(30 * ASSUMED_DAILY_HOURS)
    })

    it('converts to calendar when neither field provided', () => {
      const input = [task('whichever_first', null, null)]
      const result = repairTasks(input)
      expect(result[0].triggerType).toBe('calendar')
      expect(result[0].triggerCalendarDays).toBe(DEFAULT_CALENDAR_DAYS)
      expect(result[0].triggerHoursInterval).toBeNull()
    })
  })

  it('repairs multiple tasks in a single call', () => {
    const input = [
      task('hours', 100, null),
      task('calendar', null, null),
      task('whichever_first', 200, null)
    ]
    const result = repairTasks(input)
    expect(result).toHaveLength(3)
    expect(result[0].triggerHoursInterval).toBe(100)
    expect(result[1].triggerCalendarDays).toBe(DEFAULT_CALENDAR_DAYS)
    expect(result[2].triggerCalendarDays).toBe(
      Math.ceil(200 / ASSUMED_DAILY_HOURS)
    )
  })
})

describe('genericFallback', () => {
  it('returns isGeneric: true', () => {
    const result = genericFallback('Honda EU2200i')
    expect(result.isGeneric).toBe(true)
  })

  it('returns empty sources', () => {
    const result = genericFallback('Honda EU2200i')
    expect(result.sources).toEqual([])
  })

  it('returns 4 default tasks', () => {
    const result = genericFallback('Honda EU2200i')
    expect(result.tasks).toHaveLength(4)
  })

  it('includes model name in modelInfo', () => {
    const result = genericFallback('Honda EU2200i')
    expect(result.modelInfo).toContain('Honda EU2200i')
  })

  it('returns valid maxConsecutiveRunHours and requiredRestHours', () => {
    const result = genericFallback('Honda EU2200i')
    expect(result.maxConsecutiveRunHours).toBeGreaterThan(0)
    expect(result.requiredRestHours).toBeGreaterThan(0)
  })
})
