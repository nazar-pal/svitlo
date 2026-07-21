import {
  deleteSessionPolicy,
  logManualSessionPolicy,
  startSessionPolicy,
  stopSessionPolicy,
  updateSessionPolicy,
  type SessionRef
} from '..'

const USER = 'user-1'
const GENERATOR = 'gen-1'
const NOW = new Date('2026-04-10T12:00:00.000Z')

function makeSession(overrides: Partial<SessionRef> = {}): SessionRef {
  return {
    generatorId: GENERATOR,
    startedByUserId: USER,
    isStopped: true,
    ...overrides
  }
}

describe('startSessionPolicy', () => {
  it('rejects when the generator does not exist', () => {
    expect(
      startSessionPolicy({
        generatorExists: false,
        hasGeneratorAccess: true,
        hasOpenSession: false
      })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the user has no access', () => {
    expect(
      startSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: false,
        hasOpenSession: false
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('rejects when an open session already exists', () => {
    expect(
      startSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: true,
        hasOpenSession: true
      })
    ).toEqual({ ok: false, code: 'GENERATOR_ALREADY_ACTIVE' })
  })

  it('accepts the happy path', () => {
    expect(
      startSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: true,
        hasOpenSession: false
      })
    ).toEqual({ ok: true })
  })
})

describe('stopSessionPolicy', () => {
  it('rejects when the session is missing', () => {
    expect(
      stopSessionPolicy({ session: null, hasGeneratorAccess: true })
    ).toEqual({ ok: false, code: 'SESSION_NOT_FOUND' })
  })

  it('rejects when the session is already stopped', () => {
    expect(
      stopSessionPolicy({
        session: makeSession({ isStopped: true }),
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: false, code: 'SESSION_ALREADY_STOPPED' })
  })

  it('rejects when the user has no access', () => {
    expect(
      stopSessionPolicy({
        session: makeSession({ isStopped: false }),
        hasGeneratorAccess: false
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('accepts the happy path', () => {
    expect(
      stopSessionPolicy({
        session: makeSession({ isStopped: false }),
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: true })
  })
})

describe('deleteSessionPolicy', () => {
  it('rejects when the session is missing', () => {
    expect(
      deleteSessionPolicy({ session: null, hasGeneratorAccess: true })
    ).toEqual({ ok: false, code: 'SESSION_NOT_FOUND' })
  })

  it('rejects when the session is still active', () => {
    expect(
      deleteSessionPolicy({
        session: makeSession({ isStopped: false }),
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: false, code: 'CANNOT_DELETE_ACTIVE_SESSION' })
  })

  it('rejects when the user has no access', () => {
    expect(
      deleteSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: false
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('accepts the happy path', () => {
    expect(
      deleteSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: true
      })
    ).toEqual({ ok: true })
  })
})

describe('updateSessionPolicy', () => {
  const validInput = {
    startedAt: '2026-04-10T10:00:00.000Z',
    stoppedAt: '2026-04-10T11:00:00.000Z'
  }

  it('rejects when the session is missing', () => {
    expect(
      updateSessionPolicy({
        session: null,
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'SESSION_NOT_FOUND' })
  })

  it('rejects when the session is still active', () => {
    expect(
      updateSessionPolicy({
        session: makeSession({ isStopped: false }),
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'CANNOT_EDIT_ACTIVE_SESSION' })
  })

  it('rejects when the user has no access', () => {
    expect(
      updateSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: false,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('rejects when startedAt is not before stoppedAt', () => {
    expect(
      updateSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: true,
        startedAt: '2026-04-10T11:00:00.000Z',
        stoppedAt: '2026-04-10T11:00:00.000Z',
        now: NOW
      })
    ).toEqual({ ok: false, code: 'START_BEFORE_END' })
  })

  it('rejects when stoppedAt is in the future', () => {
    expect(
      updateSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: true,
        startedAt: '2026-04-10T10:00:00.000Z',
        stoppedAt: '2026-04-10T13:00:00.000Z',
        now: NOW
      })
    ).toEqual({ ok: false, code: 'END_TIME_IN_FUTURE' })
  })

  it('accepts the happy path', () => {
    expect(
      updateSessionPolicy({
        session: makeSession(),
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: true })
  })
})

describe('logManualSessionPolicy', () => {
  const validInput = {
    startedAt: '2026-04-10T10:00:00.000Z',
    stoppedAt: '2026-04-10T11:00:00.000Z'
  }

  it('rejects when the generator does not exist', () => {
    expect(
      logManualSessionPolicy({
        generatorExists: false,
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the user has no access', () => {
    expect(
      logManualSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: false,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: false, code: 'NOT_AUTHORIZED_FOR_GENERATOR' })
  })

  it('rejects when startedAt is not before stoppedAt', () => {
    expect(
      logManualSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: true,
        startedAt: '2026-04-10T11:00:00.000Z',
        stoppedAt: '2026-04-10T10:00:00.000Z',
        now: NOW
      })
    ).toEqual({ ok: false, code: 'START_BEFORE_END' })
  })

  it('rejects when stoppedAt is in the future', () => {
    expect(
      logManualSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: true,
        startedAt: '2026-04-10T10:00:00.000Z',
        stoppedAt: '2026-04-10T13:00:00.000Z',
        now: NOW
      })
    ).toEqual({ ok: false, code: 'END_TIME_IN_FUTURE' })
  })

  it('accepts the happy path', () => {
    expect(
      logManualSessionPolicy({
        generatorExists: true,
        hasGeneratorAccess: true,
        ...validInput,
        now: NOW
      })
    ).toEqual({ ok: true })
  })
})
