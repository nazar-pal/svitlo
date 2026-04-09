import type {
  Generator,
  GeneratorSession,
  GeneratorUserAssignment
} from '@/data/client/db-schema'
import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema/maintenance'

import { buildGeneratorListModel } from '../generator-list-model'

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

function gen(id: string, overrides: Partial<Generator> = {}): Generator {
  return {
    id,
    organizationId: 'org-1',
    title: `Gen ${id}`,
    model: 'X',
    description: null,
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    runWarningThresholdPct: 80,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function session(
  id: string,
  generatorId: string,
  startedAt: string,
  stoppedAt: string | null = null
): GeneratorSession {
  return {
    id,
    generatorId,
    startedByUserId: 'user-1',
    stoppedByUserId: stoppedAt ? 'user-1' : null,
    startedAt,
    stoppedAt
  }
}

function assignment(
  id: string,
  generatorId: string,
  userId: string
): GeneratorUserAssignment {
  return {
    id,
    generatorId,
    userId,
    assignedAt: '2026-01-01T00:00:00.000Z'
  }
}

function template(
  id: string,
  generatorId: string,
  overrides: Partial<MaintenanceTemplate> = {}
): MaintenanceTemplate {
  return {
    id,
    generatorId,
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

function record(
  id: string,
  templateId: string,
  generatorId: string,
  performedAt: string
): MaintenanceRecord {
  return {
    id,
    templateId,
    generatorId,
    performedByUserId: 'user-1',
    performedAt,
    notes: null
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('buildGeneratorListModel', () => {
  it('returns empty maps when inputs are empty', () => {
    const model = buildGeneratorListModel({
      generators: [],
      allSessions: [],
      allTemplates: [],
      allRecords: [],
      allAssignments: []
    })

    expect(model.generators).toEqual([])
    expect(model.allSessions).toEqual([])
    expect(model.sessionsByGenerator.size).toBe(0)
    expect(model.assignmentsByGenerator.size).toBe(0)
    expect(model.nextMaintenanceByGenerator.size).toBe(0)
  })

  it('passes through generators and allSessions', () => {
    const generators = [gen('g1'), gen('g2')]
    const allSessions = [session('s1', 'g1', '2026-01-15T10:00:00Z')]

    const model = buildGeneratorListModel({
      generators,
      allSessions,
      allTemplates: [],
      allRecords: [],
      allAssignments: []
    })

    expect(model.generators).toBe(generators)
    expect(model.allSessions).toBe(allSessions)
  })

  it('groups sessions by generator id', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1'), gen('g2')],
      allSessions: [
        session('s1', 'g1', '2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z'),
        session('s2', 'g1', '2026-01-15T12:00:00Z', '2026-01-15T13:00:00Z'),
        session('s3', 'g2', '2026-01-15T14:00:00Z', '2026-01-15T15:00:00Z')
      ],
      allTemplates: [],
      allRecords: [],
      allAssignments: []
    })

    expect(model.sessionsByGenerator.get('g1')).toHaveLength(2)
    expect(model.sessionsByGenerator.get('g2')).toHaveLength(1)
    expect(model.sessionsByGenerator.get('missing')).toBeUndefined()
  })

  it('groups assignments by generator id', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1'), gen('g2')],
      allSessions: [],
      allTemplates: [],
      allRecords: [],
      allAssignments: [
        assignment('a1', 'g1', 'user-a'),
        assignment('a2', 'g1', 'user-b'),
        assignment('a3', 'g2', 'user-c')
      ]
    })

    expect(model.assignmentsByGenerator.get('g1')).toHaveLength(2)
    expect(model.assignmentsByGenerator.get('g2')).toHaveLength(1)
  })

  it('computes next maintenance for each generator with templates', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1')],
      allSessions: [],
      allTemplates: [template('t1', 'g1')],
      allRecords: [],
      allAssignments: []
    })

    const next = model.nextMaintenanceByGenerator.get('g1')
    expect(next).not.toBeNull()
    expect(next?.templateId).toBe('t1')
    expect(next?.taskName).toBe('Oil change')
  })

  it('returns null next maintenance for generators without templates', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1')],
      allSessions: [],
      allTemplates: [],
      allRecords: [],
      allAssignments: []
    })

    expect(model.nextMaintenanceByGenerator.get('g1')).toBeNull()
  })

  it('includes a key for every input generator (even without templates)', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1'), gen('g2'), gen('g3')],
      allSessions: [],
      allTemplates: [template('t1', 'g1')],
      allRecords: [],
      allAssignments: []
    })

    expect(model.nextMaintenanceByGenerator.has('g1')).toBe(true)
    expect(model.nextMaintenanceByGenerator.has('g2')).toBe(true)
    expect(model.nextMaintenanceByGenerator.has('g3')).toBe(true)
    expect(model.nextMaintenanceByGenerator.get('g1')).not.toBeNull()
    expect(model.nextMaintenanceByGenerator.get('g2')).toBeNull()
    expect(model.nextMaintenanceByGenerator.get('g3')).toBeNull()
  })

  it('does not include a next-maintenance entry for templates whose generator is missing', () => {
    const model = buildGeneratorListModel({
      generators: [gen('g1')],
      allSessions: [],
      allTemplates: [template('t1', 'g1'), template('t2', 'g-other')],
      allRecords: [],
      allAssignments: []
    })

    expect(model.nextMaintenanceByGenerator.has('g-other')).toBe(false)
    expect(model.nextMaintenanceByGenerator.has('g1')).toBe(true)
  })

  it('reflects performed records in next maintenance urgency', () => {
    // Template: hours trigger, 100h interval. Performed at NOW. No sessions since.
    // Expected: 100h remaining → 'ok' urgency.
    const model = buildGeneratorListModel({
      generators: [gen('g1')],
      allSessions: [],
      allTemplates: [template('t1', 'g1')],
      allRecords: [record('r1', 't1', 'g1', NOW)],
      allAssignments: []
    })

    const next = model.nextMaintenanceByGenerator.get('g1')
    expect(next).not.toBeNull()
    expect(next?.urgency).toBe('ok')
  })

  it('scopes sessions for next-maintenance computation to the generator', () => {
    // g1 has a template + a completed long session → should affect g1 urgency
    // g2's own sessions should be irrelevant to g1
    const model = buildGeneratorListModel({
      generators: [gen('g1'), gen('g2')],
      allSessions: [
        session('s1', 'g1', '2026-01-10T00:00:00Z', '2026-01-14T00:00:00Z'),
        session('s2', 'g2', '2026-01-15T00:00:00Z', '2026-01-16T00:00:00Z')
      ],
      allTemplates: [
        template('t1', 'g1', { triggerHoursInterval: 50 }),
        template('t2', 'g2', { triggerHoursInterval: 500 })
      ],
      allRecords: [],
      allAssignments: []
    })

    const g1 = model.nextMaintenanceByGenerator.get('g1')
    const g2 = model.nextMaintenanceByGenerator.get('g2')
    expect(g1).not.toBeNull()
    expect(g2).not.toBeNull()
    // g1 accumulated ~96h > 50h interval → should be overdue
    expect(g1?.urgency).toBe('overdue')
    // g2 accumulated ~24h << 500h → should be ok
    expect(g2?.urgency).toBe('ok')
  })
})
