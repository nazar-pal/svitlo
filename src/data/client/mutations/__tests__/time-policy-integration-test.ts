import { setupMutationHarness } from './harness'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedMaintenanceRecord,
  seedMaintenanceTemplate,
  seedStoppedSession
} from './seed'

// Verifies that the 3 time-dependent policy branches are actually reachable
// through the client mutation layer. Before `MutationContext.now` existed as
// an injectable clock, these branches were covered only at the pure policy
// layer — a wiring bug between a mutation and its policy (wrong argument
// order, wrong `Date` source) would never be caught.

const h = setupMutationHarness()
const { updateSession, logManualSession } = h.mutations.sessions
const { updateMaintenanceRecord } = h.mutations.maintenance

const FROZEN = new Date('2026-01-15T12:00:00Z')

beforeEach(() => {
  seedBaseScenario(h.db)
  seedGenerator(h.db)
  seedStoppedSession(h.db)
  seedMaintenanceTemplate(h.db)
  seedMaintenanceRecord(h.db)
  h.setNow(FROZEN)
})

describe('time-dependent policy branches reachable through client mutations', () => {
  it('updateSession → END_TIME_IN_FUTURE', async () => {
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T14:00:00Z'
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'END_TIME_IN_FUTURE' }
    })
  })

  it('updateSession → START_BEFORE_END', async () => {
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T11:00:00Z',
      stoppedAt: '2026-01-15T11:00:00Z'
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'START_BEFORE_END' }
    })
  })

  it('logManualSession → END_TIME_IN_FUTURE', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T14:00:00Z'
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'END_TIME_IN_FUTURE' }
    })
  })

  it('updateMaintenanceRecord → PERFORMED_TIME_IN_FUTURE', async () => {
    const result = await updateMaintenanceRecord(IDS.adminUser, IDS.record, {
      performedAt: '2026-01-15T14:00:00Z',
      notes: null
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'PERFORMED_TIME_IN_FUTURE' }
    })
  })
})
