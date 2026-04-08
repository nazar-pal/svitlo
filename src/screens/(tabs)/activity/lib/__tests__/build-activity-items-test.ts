import type {
  Generator,
  GeneratorSession
} from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import type { Filter } from '@/lib/activity-filters'

jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
jest.mock('@/lib/utils/time', () => ({
  formatDuration: (ms: number) => `${Math.round(ms / 3600000)}h`
}))
jest.mock('@/lib/powersync/database', () => ({}))
jest.mock('@powersync/react-native', () => ({ useQuery: jest.fn() }))
jest.mock('@powersync/drizzle-driver', () => ({ toCompilableQuery: jest.fn() }))
jest.mock('@/lib/generator/use-generator-scope', () => ({
  useGeneratorScope: jest.fn()
}))

const { buildActivityItems } = require('../use-activity-data')

const T = '2026-01-15T12:00:00Z'

function makeSession(
  overrides: Partial<GeneratorSession> = {}
): GeneratorSession {
  return {
    id: 'sess-1',
    generatorId: 'gen-1',
    startedByUserId: 'user-1',
    stoppedByUserId: null,
    startedAt: '2026-01-15T10:00:00Z',
    stoppedAt: null,
    ...overrides
  }
}

function makeRecord(
  overrides: Partial<MaintenanceRecord> = {}
): MaintenanceRecord {
  return {
    id: 'rec-1',
    templateId: 'tmpl-1',
    generatorId: 'gen-1',
    performedByUserId: 'user-1',
    performedAt: '2026-01-15T11:00:00Z',
    notes: null,
    ...overrides
  }
}

function makeGenerator(overrides: Partial<Generator> = {}): Generator {
  return {
    id: 'gen-1',
    organizationId: 'org-1',
    title: 'Honda EU2200i',
    model: 'EU2200i',
    description: null,
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    runWarningThresholdPct: 80,
    createdAt: T,
    ...overrides
  }
}

const defaultTemplates = [{ id: 'tmpl-1', taskName: 'Oil change' }]
const defaultGenerators = [makeGenerator()]
const allVisible = new Set(['gen-1'])
const resolveName = () => 'Test User'

function build(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  filter: Filter = 'all',
  opts?: {
    templates?: { id: string; taskName: string }[]
    generators?: Generator[]
    visible?: Set<string>
    resolveName?: (uid: string) => string
  }
) {
  return buildActivityItems(
    sessions,
    records,
    opts?.templates ?? defaultTemplates,
    opts?.generators ?? defaultGenerators,
    opts?.visible ?? allVisible,
    filter,
    opts?.resolveName ?? resolveName
  )
}

describe('buildActivityItems', () => {
  it('returns empty array for empty inputs', () => {
    expect(build([], [])).toEqual([])
  })

  it('returns session items sorted by timestamp desc', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: '2026-01-15T08:00:00Z' }),
      makeSession({ id: 's2', startedAt: '2026-01-15T10:00:00Z' })
    ]
    const items = build(sessions, [])
    expect(items).toHaveLength(2)
    expect(items[0].id).toBe('s2')
    expect(items[1].id).toBe('s1')
  })

  it('returns maintenance items sorted by timestamp desc', () => {
    const records = [
      makeRecord({ id: 'r1', performedAt: '2026-01-15T09:00:00Z' }),
      makeRecord({ id: 'r2', performedAt: '2026-01-15T11:00:00Z' })
    ]
    const items = build([], records)
    expect(items).toHaveLength(2)
    expect(items[0].id).toBe('r2')
    expect(items[1].id).toBe('r1')
  })

  it('interleaves sessions and maintenance sorted by timestamp desc', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: '2026-01-15T10:00:00Z' })
    ]
    const records = [
      makeRecord({ id: 'r1', performedAt: '2026-01-15T11:00:00Z' })
    ]
    const items = build(sessions, records)
    expect(items.map((i: { id: string }) => i.id)).toEqual(['r1', 's1'])
  })

  it('filter=sessions excludes maintenance', () => {
    const items = build([makeSession()], [makeRecord()], 'sessions')
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('session')
  })

  it('filter=maintenance excludes sessions', () => {
    const items = build([makeSession()], [makeRecord()], 'maintenance')
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('maintenance')
  })

  it('filters by visible generator IDs', () => {
    const items = build(
      [makeSession({ generatorId: 'gen-hidden' })],
      [makeRecord({ generatorId: 'gen-hidden' })],
      'all',
      { visible: new Set(['gen-1']) }
    )
    expect(items).toHaveLength(0)
  })

  it('in-progress session has isInProgress=true and i18n duration label', () => {
    const items = build([makeSession({ stoppedAt: null })], [])
    expect(items[0].isInProgress).toBe(true)
    expect(items[0].duration).toBe('activity.inProgress')
  })

  it('completed session has isInProgress=false and computed duration', () => {
    const items = build(
      [
        makeSession({
          startedAt: '2026-01-15T10:00:00Z',
          stoppedAt: '2026-01-15T12:00:00Z',
          stoppedByUserId: 'user-1'
        })
      ],
      []
    )
    expect(items[0].isInProgress).toBe(false)
    expect(items[0].duration).toBe('2h')
  })

  it('unknown generator falls back to i18n key', () => {
    const items = build([makeSession({ generatorId: 'gen-1' })], [], 'all', {
      generators: [],
      visible: new Set(['gen-1'])
    })
    expect(items[0].generatorTitle).toBe('activity.unknownGenerator')
  })

  it('unknown template falls back to i18n key', () => {
    const items = build([], [makeRecord({ templateId: 'missing' })], 'all', {
      templates: []
    })
    expect(items[0].templateName).toBe('activity.unknownTask')
  })

  it('calls resolveUserName with correct userId', () => {
    const resolve = jest.fn().mockReturnValue('Resolved')
    build(
      [makeSession({ startedByUserId: 'uid-session' })],
      [makeRecord({ performedByUserId: 'uid-record' })],
      'all',
      { resolveName: resolve }
    )
    expect(resolve).toHaveBeenCalledWith('uid-session')
    expect(resolve).toHaveBeenCalledWith('uid-record')
  })
})
