import {
  initialState,
  projectPhase,
  reduce,
  type StartupPhase,
  type StartupState
} from '../reducer'

const at = (phase: StartupPhase): StartupState => projectPhase(phase)

describe('projectPhase', () => {
  it('keeps the splash visible during cold-start and db initialization', () => {
    expect(projectPhase('cold-start')).toEqual({
      phase: 'cold-start',
      splashHidden: false,
      error: null
    })
    expect(projectPhase('initializing-db')).toEqual({
      phase: 'initializing-db',
      splashHidden: false,
      error: null
    })
  })

  it('hides the splash for first-sync, unauthenticated, db-failed, and ready', () => {
    for (const phase of [
      'first-sync',
      'unauthenticated',
      'db-failed',
      'ready'
    ] as const)
      expect(projectPhase(phase)).toEqual({
        phase,
        splashHidden: true,
        error: null
      })
  })
})

describe('reduce', () => {
  it('starts at cold-start with the splash visible', () => {
    expect(initialState).toEqual({
      phase: 'cold-start',
      splashHidden: false,
      error: null
    })
  })

  describe('INIT_REQUESTED', () => {
    it('enters initializing-db from cold-start, unauthenticated, or db-failed', () => {
      for (const phase of [
        'cold-start',
        'unauthenticated',
        'db-failed'
      ] as const)
        expect(reduce(at(phase), { type: 'INIT_REQUESTED' })).toEqual(
          projectPhase('initializing-db')
        )
    })

    it('is ignored once initialization is underway or finished', () => {
      for (const phase of ['initializing-db', 'first-sync', 'ready'] as const) {
        const before = at(phase)
        expect(reduce(before, { type: 'INIT_REQUESTED' })).toBe(before)
      }
    })
  })

  describe('INIT_SUCCEEDED', () => {
    it('advances initializing-db to first-sync and hides the splash', () => {
      expect(reduce(at('initializing-db'), { type: 'INIT_SUCCEEDED' })).toEqual(
        projectPhase('first-sync')
      )
    })

    it('is ignored from any other phase', () => {
      for (const phase of [
        'cold-start',
        'unauthenticated',
        'db-failed',
        'first-sync',
        'ready'
      ] as const) {
        const before = at(phase)
        expect(reduce(before, { type: 'INIT_SUCCEEDED' })).toBe(before)
      }
    })
  })

  describe('INIT_FAILED', () => {
    it('moves initializing-db to db-failed carrying the error message', () => {
      expect(
        reduce(at('initializing-db'), {
          type: 'INIT_FAILED',
          message: 'disk full'
        })
      ).toEqual({
        phase: 'db-failed',
        splashHidden: true,
        error: { message: 'disk full' }
      })
    })

    it('ignores a stale failure once we have left initializing-db (timer-leak guard)', () => {
      for (const phase of ['first-sync', 'db-failed', 'ready'] as const) {
        const before = at(phase)
        expect(
          reduce(before, { type: 'INIT_FAILED', message: 'late timeout' })
        ).toBe(before)
      }
    })
  })

  describe('SYNC_COMPLETED', () => {
    it('advances first-sync to ready', () => {
      expect(reduce(at('first-sync'), { type: 'SYNC_COMPLETED' })).toEqual(
        projectPhase('ready')
      )
    })

    it('only fires from first-sync — ignored from every other phase', () => {
      for (const phase of [
        'cold-start',
        'initializing-db',
        'unauthenticated',
        'ready'
      ] as const) {
        const before = at(phase)
        expect(reduce(before, { type: 'SYNC_COMPLETED' })).toBe(before)
      }
    })
  })

  describe('IDENTITY_LOST', () => {
    it('collapses to unauthenticated from every active phase', () => {
      for (const phase of [
        'cold-start',
        'initializing-db',
        'db-failed',
        'first-sync',
        'ready'
      ] as const)
        expect(reduce(at(phase), { type: 'IDENTITY_LOST' })).toEqual(
          projectPhase('unauthenticated')
        )
    })

    it('is a no-op when already unauthenticated', () => {
      const before = at('unauthenticated')
      expect(reduce(before, { type: 'IDENTITY_LOST' })).toBe(before)
    })
  })

  describe('RETRY', () => {
    it('re-enters initializing-db from db-failed', () => {
      expect(reduce(at('db-failed'), { type: 'RETRY' })).toEqual(
        projectPhase('initializing-db')
      )
    })

    it('is ignored outside db-failed', () => {
      for (const phase of ['cold-start', 'first-sync', 'ready'] as const) {
        const before = at(phase)
        expect(reduce(before, { type: 'RETRY' })).toBe(before)
      }
    })
  })
})
