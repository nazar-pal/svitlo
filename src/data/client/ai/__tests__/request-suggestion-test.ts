import { requestSuggestion } from '../request-suggestion'
import type {
  AIPort,
  OrchestratorCopy,
  SuggestionPlan,
  SuggestionRequest
} from '../ai-port'

const copy: OrchestratorCopy = {
  offline: { title: 'Offline', message: 'No internet' },
  timeoutMessage: 'Timed out',
  fallbackErrorMessage: 'Generic error',
  errorTitle: 'Error',
  genericPrompt: {
    title: 'Generic',
    message: 'Use generic?',
    confirmLabel: 'Yes',
    cancelLabel: 'No'
  }
}

const request: SuggestionRequest = { generatorModel: 'X', locale: 'en' }

function makePlan(overrides: Partial<SuggestionPlan> = {}): SuggestionPlan {
  return {
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    tasks: [],
    sources: [],
    modelInfo: '',
    isGeneric: false,
    ...overrides
  }
}

interface FakePort {
  port: AIPort
  setConnectivity(v: boolean): void
  resolvePlan(p: SuggestionPlan): void
  rejectPlan(e: unknown): void
  resolvePrompt(v: boolean): void
  waitForPrompt(): Promise<void>
  alertErrorCalls: { title: string; message: string }[]
  alertPromptCalls: number
  requestPlanCallCount(): number
  hasPendingPlan(): boolean
}

function makeFakePort(): FakePort {
  let connectivity = true
  const alertErrorCalls: { title: string; message: string }[] = []
  let alertPromptCalls = 0
  let pendingPlan: {
    resolve: (p: SuggestionPlan) => void
    reject: (e: unknown) => void
  } | null = null
  let pendingPrompt: ((b: boolean) => void) | null = null
  let promptCalledNotifier: (() => void) | null = null
  let requestPlanCount = 0

  const port: AIPort = {
    async checkConnectivity() {
      return connectivity
    },
    requestPlan(_req, signal) {
      requestPlanCount++
      return new Promise<SuggestionPlan>((resolve, reject) => {
        pendingPlan = { resolve, reject }
        if (signal.aborted) {
          reject(new Error('Aborted'))
          return
        }
        signal.addEventListener('abort', () => reject(new Error('Aborted')))
      })
    },
    async alertPrompt(_copy) {
      alertPromptCalls++
      return new Promise<boolean>(resolve => {
        pendingPrompt = resolve
        promptCalledNotifier?.()
      })
    },
    async alertError(c) {
      alertErrorCalls.push(c)
    },
    now() {
      return Date.now()
    },
    sleep(ms, signal) {
      return new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, ms)
        signal.addEventListener('abort', () => {
          clearTimeout(id)
          reject(new Error('Aborted'))
        })
      })
    }
  }

  return {
    port,
    setConnectivity(v) {
      connectivity = v
    },
    resolvePlan(p) {
      pendingPlan?.resolve(p)
    },
    rejectPlan(e) {
      pendingPlan?.reject(e)
    },
    resolvePrompt(v) {
      pendingPrompt?.(v)
    },
    waitForPrompt() {
      if (pendingPrompt) return Promise.resolve()
      return new Promise<void>(resolve => {
        promptCalledNotifier = resolve
      })
    },
    alertErrorCalls,
    get alertPromptCalls() {
      return alertPromptCalls
    },
    requestPlanCallCount() {
      return requestPlanCount
    },
    hasPendingPlan() {
      return pendingPlan !== null
    }
  }
}

describe('requestSuggestion', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns offline when connectivity check fails', async () => {
    const fake = makeFakePort()
    fake.setConnectivity(false)
    const ctrl = new AbortController()

    const result = await requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    expect(result).toEqual({ kind: 'offline' })
    expect(fake.requestPlanCallCount()).toBe(0)
    expect(fake.alertErrorCalls).toEqual([copy.offline])
  })

  it('returns cancelled when signal is pre-aborted', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    ctrl.abort()

    const result = await requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    expect(result).toEqual({ kind: 'cancelled' })
    expect(fake.requestPlanCallCount()).toBe(0)
    expect(fake.alertErrorCalls).toHaveLength(0)
  })

  it('returns cancelled when aborted during in-flight request', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    ctrl.abort()

    const result = await promise
    expect(result).toEqual({ kind: 'cancelled' })
    expect(fake.alertErrorCalls).toHaveLength(0)
  })

  it('returns failed with timeout message when sleep fires first', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal,
      timeoutMs: 45_000
    })

    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(45_000)

    const result = await promise
    expect(result).toEqual({ kind: 'failed', message: copy.timeoutMessage })
    expect(fake.alertErrorCalls).toEqual([
      { title: copy.errorTitle, message: copy.timeoutMessage }
    ])
  })

  it('returns failed with rpc error message', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    fake.rejectPlan(new Error('boom'))

    const result = await promise
    expect(result).toEqual({ kind: 'failed', message: 'boom' })
    expect(fake.alertErrorCalls).toEqual([
      { title: copy.errorTitle, message: 'boom' }
    ])
  })

  it('returns accepted for non-generic plan without prompting', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    const plan = makePlan({ isGeneric: false })

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    fake.resolvePlan(plan)

    const result = await promise
    expect(result).toEqual({ kind: 'accepted', plan })
    expect(fake.alertPromptCalls).toBe(0)
  })

  it('returns accepted when generic plan is confirmed', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    const plan = makePlan({ isGeneric: true })

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    fake.resolvePlan(plan)
    await fake.waitForPrompt()
    fake.resolvePrompt(true)

    const result = await promise
    expect(result).toEqual({ kind: 'accepted', plan })
    expect(fake.alertPromptCalls).toBe(1)
  })

  it('returns rejected-generic when generic plan is declined', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    const plan = makePlan({ isGeneric: true })

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    fake.resolvePlan(plan)
    await fake.waitForPrompt()
    fake.resolvePrompt(false)

    const result = await promise
    expect(result).toEqual({ kind: 'rejected-generic', plan })
  })

  it('success wins race against timeout, no alert', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    const plan = makePlan({ isGeneric: false })

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal,
      timeoutMs: 45_000
    })

    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(44_000)
    fake.resolvePlan(plan)

    const result = await promise
    expect(result).toEqual({ kind: 'accepted', plan })
    expect(fake.alertErrorCalls).toHaveLength(0)
  })

  it('returns cancelled if signal aborts after plan, before prompt response', async () => {
    const fake = makeFakePort()
    const ctrl = new AbortController()
    const plan = makePlan({ isGeneric: true })

    const promise = requestSuggestion({
      request,
      port: fake.port,
      copy,
      signal: ctrl.signal
    })

    await Promise.resolve()
    await Promise.resolve()
    fake.resolvePlan(plan)
    await fake.waitForPrompt()
    ctrl.abort()
    fake.resolvePrompt(false)

    const result = await promise
    expect(result).toEqual({ kind: 'cancelled' })
  })
})
