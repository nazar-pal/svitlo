import type { GeneratorSession } from '@/data/client/db-schema'
import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema/maintenance'

import {
  computeAllMaintenanceItems,
  computeMaintenanceDue,
  computeNextMaintenance,
  formatMaintenanceLabel
} from '../due'

// ── Fake timers ────────────────────────────────────────────────────────────

const NOW = '2026-02-01T12:00:00.000Z'

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(NOW))
})

afterEach(() => {
  jest.useRealTimers()
})

// ── Factory helpers ────────────────────────────────────────────────────────

function session(
  startedAt: string,
  stoppedAt: string | null = null
): GeneratorSession {
  return {
    id: `s-${startedAt}`,
    generatorId: 'gen-1',
    startedByUserId: 'user-1',
    stoppedByUserId: stoppedAt ? 'user-1' : null,
    startedAt,
    stoppedAt
  }
}

function template(
  overrides: Partial<MaintenanceTemplate> = {}
): MaintenanceTemplate {
  return {
    id: 'tmpl-1',
    generatorId: 'gen-1',
    taskName: 'Oil change',
    description: null,
    triggerType: 'hours',
    triggerHoursInterval: 100,
    triggerCalendarDays: null,
    isOneTime: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function record(templateId: string, performedAt: string): MaintenanceRecord {
  return {
    id: `rec-${performedAt}`,
    templateId,
    generatorId: 'gen-1',
    performedByUserId: 'user-1',
    performedAt,
    notes: null
  }
}

// ── computeMaintenanceDue ──────────────────────────────────────────────────

describe('computeMaintenanceDue', () => {
  describe('hours trigger', () => {
    it('returns ok when hours remaining is above 20% threshold', () => {
      // 100h interval, 50h used → 50h remaining (> 20h threshold)
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z')
      ] // 50h
      const result = computeMaintenanceDue(template(), [], sessions)
      expect(result.urgency).toBe('ok')
    })

    it('returns overdue when session hours exceed interval', () => {
      // 100h interval, 110h used → -10h remaining
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-05T14:00:00.000Z') // 110h
      ]
      const result = computeMaintenanceDue(template(), [], sessions)
      expect(result.urgency).toBe('overdue')
    })

    it('returns due_soon when within 20% threshold', () => {
      // 100h interval, 85h used → 15h remaining (≤ 20h = 20% of 100)
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-04T13:00:00.000Z') // 85h
      ]
      const result = computeMaintenanceDue(template(), [], sessions)
      expect(result.urgency).toBe('due_soon')
    })
  })

  describe('calendar trigger', () => {
    const calendarTmpl = template({
      triggerType: 'calendar',
      triggerHoursInterval: null,
      triggerCalendarDays: 30
    })

    it('returns ok using createdAt when there are no records', () => {
      // created 2026-01-01, now 2026-02-01 → 31 days elapsed, but tmpl starts from creation
      // 30 - 31 = -1 → overdue
      // Use a template created recently so it's ok
      const recentTmpl = template({
        ...calendarTmpl,
        createdAt: '2026-01-20T00:00:00.000Z' // 12 days ago
      })
      const result = computeMaintenanceDue(recentTmpl, [], [])
      expect(result.urgency).toBe('ok')
    })

    it('returns overdue when calendar days exceeded', () => {
      const result = computeMaintenanceDue(calendarTmpl, [], [])
      // created 2026-01-01, now 2026-02-01 → 31 days > 30 day interval
      expect(result.urgency).toBe('overdue')
    })

    it('returns due_soon at exact 20% boundary', () => {
      // 30 day interval, 20% = 6 days. daysRemaining ≤ 6 → due_soon
      // Need daysRemaining = 6 exactly: 30 - daysBetween(ref, now) = 6 → daysBetween = 24
      const tmpl = template({
        ...calendarTmpl,
        createdAt: '2026-01-08T12:00:00.000Z' // exactly 24 days before NOW
      })
      const result = computeMaintenanceDue(tmpl, [], [])
      expect(result.urgency).toBe('due_soon')
    })
  })

  describe('whichever_first trigger', () => {
    const whicheverTmpl = template({
      triggerType: 'whichever_first',
      triggerHoursInterval: 200,
      triggerCalendarDays: 90
    })

    it('returns overdue when hours overdue but calendar ok', () => {
      // 200h interval, 210h sessions → hours overdue. Calendar: 90 - 31 days = 59 days remaining → ok
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-09T18:00:00.000Z') // 210h
      ]
      const result = computeMaintenanceDue(whicheverTmpl, [], sessions)
      expect(result.urgency).toBe('overdue')
    })

    it('returns overdue when calendar overdue but hours ok', () => {
      // Short calendar, long hours
      const tmpl = template({
        triggerType: 'whichever_first',
        triggerHoursInterval: 1000,
        triggerCalendarDays: 15 // 15 days, but 31 days elapsed → overdue
      })
      const result = computeMaintenanceDue(tmpl, [], [])
      expect(result.urgency).toBe('overdue')
    })
  })

  describe('isOneTime', () => {
    it('returns ok when isOneTime=1 and a record exists', () => {
      const tmpl = template({ isOneTime: 1 })
      const records = [record('tmpl-1', '2026-01-15T00:00:00.000Z')]
      // Even with tons of hours, should be ok
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-20T00:00:00.000Z')
      ]
      const result = computeMaintenanceDue(tmpl, records, sessions)
      expect(result.urgency).toBe('ok')
    })

    it('computes normally when isOneTime=1 and no record exists', () => {
      const tmpl = template({
        isOneTime: 1,
        triggerHoursInterval: 10
      })
      // 50h run → overdue
      const sessions = [
        session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z')
      ]
      const result = computeMaintenanceDue(tmpl, [], sessions)
      expect(result.urgency).toBe('overdue')
    })
  })

  it('uses current time for open sessions', () => {
    // Open session started 50h before NOW
    const sessions = [session('2026-01-30T10:00:00.000Z')]
    // 100h interval, ~50h elapsed → ok
    const result = computeMaintenanceDue(template(), [], sessions)
    expect(result.urgency).toBe('ok')
  })

  it('uses latest record by performedAt when multiple records exist', () => {
    const records = [
      record('tmpl-1', '2026-01-10T00:00:00.000Z'),
      record('tmpl-1', '2026-01-25T00:00:00.000Z') // more recent
    ]
    // Session spans the since boundary — hours before 2026-01-25 are clamped
    const sessions = [
      session('2026-01-20T00:00:00.000Z', '2026-02-01T08:00:00.000Z')
    ]
    // Hours from 2026-01-25 to 2026-02-01T08:00 = ~176h. 100h interval → overdue
    const result = computeMaintenanceDue(template(), records, sessions)
    expect(result.urgency).toBe('overdue')
  })

  it('skips sessions that ended before since timestamp', () => {
    const records = [record('tmpl-1', '2026-01-20T00:00:00.000Z')]
    const sessions = [
      session('2026-01-10T00:00:00.000Z', '2026-01-15T00:00:00.000Z'), // ended before record → skipped
      session('2026-01-25T00:00:00.000Z', '2026-01-26T00:00:00.000Z') // 24h after record
    ]
    // Only 24h counted, 100h interval → 76h remaining → ok
    const result = computeMaintenanceDue(
      template({ triggerHoursInterval: 100 }),
      records,
      sessions
    )
    expect(result.urgency).toBe('ok')
  })

  it('partially counts sessions that span the since boundary', () => {
    const records = [record('tmpl-1', '2026-01-20T00:00:00.000Z')]
    const sessions = [
      session('2026-01-18T00:00:00.000Z', '2026-01-21T00:00:00.000Z') // spans since, 24h after clamping
    ]
    // Only 24h counted (Jan 20→Jan 21), 100h interval → ok
    const result = computeMaintenanceDue(template(), records, sessions)
    expect(result.urgency).toBe('ok')
    expect(result.lastPerformedAt).toBe('2026-01-20T00:00:00.000Z')
  })
})

// ── computeAllMaintenanceItems ─────────────────────────────────────────────

describe('computeAllMaintenanceItems', () => {
  it('returns empty array for empty templates', () => {
    expect(computeAllMaintenanceItems([], [], [])).toEqual([])
  })

  it('sorts overdue before due_soon before ok', () => {
    const templates = [
      template({ id: 'ok', triggerHoursInterval: 1000 }), // lots of headroom
      template({ id: 'overdue', triggerHoursInterval: 10 }),
      template({ id: 'due-soon', triggerHoursInterval: 55 }) // 50/55 → within 20%
    ]
    const sessions = [
      session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z') // 50h
    ]
    const items = computeAllMaintenanceItems(templates, [], sessions)
    expect(items.map(i => i.templateId)).toEqual(['overdue', 'due-soon', 'ok'])
  })

  it('sorts by sortValue ascending within the same urgency tier', () => {
    const templates = [
      template({ id: 'less-urgent', triggerHoursInterval: 70 }), // 20h remaining
      template({ id: 'more-urgent', triggerHoursInterval: 60 }) // 10h remaining
    ]
    const sessions = [
      session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z') // 50h
    ]
    const items = computeAllMaintenanceItems(templates, [], sessions)
    expect(items.map(i => i.templateId)).toEqual(['more-urgent', 'less-urgent'])
  })

  it('gives isOneTime completed items sortValue Infinity (sorts last in ok)', () => {
    const templates = [
      template({ id: 'one-time-done', isOneTime: 1 }),
      template({ id: 'recurring-ok', triggerHoursInterval: 1000 })
    ]
    const records = [record('one-time-done', '2026-01-15T00:00:00.000Z')]
    const items = computeAllMaintenanceItems(templates, records, [])
    // recurring-ok has finite sortValue, one-time-done has Infinity → recurring first
    expect(items.map(i => i.templateId)).toEqual([
      'recurring-ok',
      'one-time-done'
    ])
  })

  it('uses min(hoursRemaining, daysRemaining*24) as sortValue for whichever_first', () => {
    const templates = [
      template({
        id: 'hours-closer',
        triggerType: 'whichever_first',
        triggerHoursInterval: 60, // 10h remaining
        triggerCalendarDays: 90, // ~59 days = 1416h remaining
        createdAt: '2026-01-01T00:00:00.000Z'
      }),
      template({
        id: 'days-closer',
        triggerType: 'whichever_first',
        triggerHoursInterval: 1000, // 950h remaining
        triggerCalendarDays: 33, // ~2 days = 48h remaining
        createdAt: '2026-01-01T00:00:00.000Z'
      })
    ]
    const sessions = [
      session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z') // 50h
    ]
    const items = computeAllMaintenanceItems(templates, [], sessions)
    // hours-closer: min(10, 59*24) = 10
    // days-closer: min(950, 2*24) = 48
    expect(items.map(i => i.templateId)).toEqual([
      'hours-closer',
      'days-closer'
    ])
  })
})

// ── computeNextMaintenance ─────────────────────────────────────────────────

describe('computeNextMaintenance', () => {
  it('returns null for empty templates', () => {
    expect(computeNextMaintenance([], [], [])).toBeNull()
  })

  it('returns the most urgent item', () => {
    const templates = [
      template({ id: 'ok', triggerHoursInterval: 1000 }),
      template({ id: 'overdue', triggerHoursInterval: 10 })
    ]
    const sessions = [
      session('2026-01-01T00:00:00.000Z', '2026-01-03T02:00:00.000Z') // 50h
    ]
    const result = computeNextMaintenance(templates, [], sessions)
    expect(result?.templateId).toBe('overdue')
    expect(result?.urgency).toBe('overdue')
  })

  it('excludes generatorId from the returned shape', () => {
    const result = computeNextMaintenance([template()], [], [])
    expect(result).not.toHaveProperty('generatorId')
    expect(result).toHaveProperty('templateId')
    expect(result).toHaveProperty('taskName')
    expect(result).toHaveProperty('urgency')
  })
})

// ── formatMaintenanceLabel ─────────────────────────────────────────────────

describe('formatMaintenanceLabel', () => {
  describe('overdue', () => {
    it('formats hours only', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: -5,
        daysRemaining: null
      })
      expect(label).toBe('5.0h overdue')
    })

    it('formats days only', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: null,
        daysRemaining: -3.2
      })
      // Math.ceil(3.2) = 4
      expect(label).toBe('4d overdue')
    })

    it('formats both when hours dominate', () => {
      // overdueHours=48 >= overdueDays*24=2*24=48 → hours
      const label = formatMaintenanceLabel({
        hoursRemaining: -48,
        daysRemaining: -2
      })
      expect(label).toBe('48h overdue')
    })

    it('formats both when days dominate', () => {
      // overdueHours=10 < overdueDays*24=3*24=72 → days
      const label = formatMaintenanceLabel({
        hoursRemaining: -10,
        daysRemaining: -3
      })
      // Math.ceil(3) = 3
      expect(label).toBe('3d overdue')
    })

    it('formats sub-hour overdue as minutes', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: -0.5,
        daysRemaining: null
      })
      expect(label).toBe('30m overdue')
    })
  })

  describe('not overdue', () => {
    it('formats hours only', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: 5,
        daysRemaining: null
      })
      expect(label).toBe('in 5.0h')
    })

    it('formats days only', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: null,
        daysRemaining: 3.4
      })
      // Math.round(3.4) = 3
      expect(label).toBe('in 3d')
    })

    it('formats both when hours closer', () => {
      // hoursRemaining=10 <= daysRemaining*24=2*24=48 → hours
      const label = formatMaintenanceLabel({
        hoursRemaining: 10,
        daysRemaining: 2
      })
      expect(label).toBe('in 10h')
    })

    it('formats both when days closer', () => {
      // hoursRemaining=100 > daysRemaining*24=2*24=48 → days
      const label = formatMaintenanceLabel({
        hoursRemaining: 100,
        daysRemaining: 2
      })
      expect(label).toBe('in 2d')
    })

    it('formats sub-hour as minutes', () => {
      const label = formatMaintenanceLabel({
        hoursRemaining: 0.5,
        daysRemaining: null
      })
      expect(label).toBe('in 30m')
    })
  })

  it('returns empty string when both are null', () => {
    expect(
      formatMaintenanceLabel({ hoursRemaining: null, daysRemaining: null })
    ).toBe('')
  })
})
