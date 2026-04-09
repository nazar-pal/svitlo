import type {
  Generator,
  GeneratorSession,
  GeneratorUserAssignment
} from '@/data/client/db-schema/generators'
import type { NextMaintenanceCardInfo } from '@/lib/maintenance/due'

jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

const { buildHomeCarouselItems } =
  require('../build-home-carousel-items') as typeof import('../build-home-carousel-items')

function makeGenerator(overrides: Partial<Generator> = {}): Generator {
  return {
    id: 'gen-1',
    organizationId: 'org-1',
    title: 'Gen 1',
    model: 'Model A',
    description: null,
    maxConsecutiveRunHours: 8,
    requiredRestHours: 1,
    runWarningThresholdPct: 80,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function makeSession(
  overrides: Partial<GeneratorSession> = {}
): GeneratorSession {
  return {
    id: 'sess-1',
    generatorId: 'gen-1',
    startedByUserId: 'user-1',
    stoppedByUserId: 'user-1',
    startedAt: '2026-01-15T10:00:00Z',
    stoppedAt: '2026-01-15T11:00:00Z',
    ...overrides
  }
}

function makeAssignment(
  overrides: Partial<GeneratorUserAssignment> = {}
): GeneratorUserAssignment {
  return {
    id: 'asg-1',
    generatorId: 'gen-1',
    userId: 'user-1',
    assignedAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

const USERS = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' }
]

describe('buildHomeCarouselItems', () => {
  it('returns [] for empty generators', () => {
    const result = buildHomeCarouselItems({
      generators: [],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: true
    })
    expect(result).toEqual([])
  })

  it('admin=true maps assignedUserNames in assignment order', () => {
    const g = makeGenerator()
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map([
        [
          g.id,
          [
            makeAssignment({ id: 'asg-a', userId: 'user-2' }),
            makeAssignment({ id: 'asg-b', userId: 'user-1' })
          ]
        ]
      ]),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: true
    })
    expect(result[0].assignedUserNames).toEqual(['Bob', 'Alice'])
  })

  it('admin=false returns [] regardless of assignments', () => {
    const g = makeGenerator()
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map([
        [
          g.id,
          [
            makeAssignment({ id: 'asg-a', userId: 'user-1' }),
            makeAssignment({ id: 'asg-b', userId: 'user-2' })
          ]
        ]
      ]),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: false
    })
    expect(result[0].assignedUserNames).toEqual([])
  })

  it('missing user in users falls back to common.unknown', () => {
    const g = makeGenerator()
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map([
        [g.id, [makeAssignment({ userId: 'ghost' })]]
      ]),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: true
    })
    expect(result[0].assignedUserNames).toEqual(['common.unknown'])
  })

  it('isMyActiveSession is true for the matching generator and false for others', () => {
    const g1 = makeGenerator({ id: 'gen-1' })
    const g2 = makeGenerator({ id: 'gen-2' })
    const result = buildHomeCarouselItems({
      generators: [g1, g2],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: makeSession({
        id: 'open',
        generatorId: 'gen-2',
        stoppedAt: null,
        stoppedByUserId: null
      }),
      users: USERS,
      admin: false
    })
    expect(result[0].isMyActiveSession).toBe(false)
    expect(result[1].isMyActiveSession).toBe(true)
  })

  it('isMyActiveSession is false for every item when myActiveSession is null', () => {
    const g1 = makeGenerator({ id: 'gen-1' })
    const g2 = makeGenerator({ id: 'gen-2' })
    const result = buildHomeCarouselItems({
      generators: [g1, g2],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: false
    })
    expect(result.every(i => i.isMyActiveSession === false)).toBe(true)
  })

  it('nextMaintenanceByGenerator hit returns the map value', () => {
    const g = makeGenerator()
    const info: NextMaintenanceCardInfo = {
      templateId: 'tmpl-1',
      taskName: 'Oil change',
      urgency: 'due_soon',
      hoursRemaining: 5,
      daysRemaining: null
    }
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map([[g.id, info]]),
      myActiveSession: null,
      users: USERS,
      admin: false
    })
    expect(result[0].nextMaintenance).toBe(info)
  })

  it('nextMaintenanceByGenerator miss returns null', () => {
    const g = makeGenerator()
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: false
    })
    expect(result[0].nextMaintenance).toBeNull()
  })

  it('empty sessions produce lifetimeHours=0 and status=available', () => {
    const g = makeGenerator()
    const result = buildHomeCarouselItems({
      generators: [g],
      sessionsByGenerator: new Map(),
      assignmentsByGenerator: new Map(),
      nextMaintenanceByGenerator: new Map(),
      myActiveSession: null,
      users: USERS,
      admin: false
    })
    expect(result[0].lifetimeHours).toBe(0)
    expect(result[0].statusInfo.status).toBe('available')
    expect(result[0].statusInfo.openSession).toBeNull()
    expect(result[0].statusInfo.consecutiveRunHours).toBe(0)
  })
})
