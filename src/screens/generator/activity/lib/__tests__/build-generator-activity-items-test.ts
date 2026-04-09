import type { GeneratorSession } from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import type { Filter } from '@/lib/activity-filters'

jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

const { buildActivityItems } =
  require('../build-generator-activity-items') as typeof import('../build-generator-activity-items')

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

const defaultTemplates = [{ id: 'tmpl-1', taskName: 'Oil change' }]

function build(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  filter: Filter = 'all',
  templates = defaultTemplates
) {
  return buildActivityItems(sessions, records, templates, filter)
}

describe('buildActivityItems (generator screen)', () => {
  it('returns empty array for empty inputs', () => {
    expect(build([], [])).toEqual([])
  })

  it('filter=all includes both sessions and maintenance', () => {
    const items = build([makeSession()], [makeRecord()])
    expect(items).toHaveLength(2)
    expect(items.map(i => i.type).sort()).toEqual(['maintenance', 'session'])
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

  it('sorts mixed items by timestamp desc', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: '2026-01-15T08:00:00Z' }),
      makeSession({ id: 's2', startedAt: '2026-01-15T12:00:00Z' })
    ]
    const records = [
      makeRecord({ id: 'r1', performedAt: '2026-01-15T10:00:00Z' })
    ]
    const items = build(sessions, records)
    expect(items.map(i => i.id)).toEqual(['s2', 'r1', 's1'])
  })

  it('uses templateName from templates list', () => {
    const items = build([], [makeRecord()], 'maintenance')
    expect(items).toHaveLength(1)
    const item = items[0]
    if (item.type !== 'maintenance') throw new Error('expected maintenance')
    expect(item.templateName).toBe('Oil change')
  })

  it('falls back to activity.unknownTask when templateId is unknown', () => {
    const record = makeRecord({ templateId: 'missing' })
    const items = build([], [record], 'maintenance')
    const item = items[0]
    if (item.type !== 'maintenance') throw new Error('expected maintenance')
    expect(item.templateName).toBe('activity.unknownTask')
  })
})
