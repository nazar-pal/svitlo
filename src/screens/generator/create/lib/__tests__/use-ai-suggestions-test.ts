import { act, renderHook, waitFor } from '@testing-library/react-native'

import type {
  AIPort,
  SuggestionPlan,
  SuggestionResult
} from '@/data/client/ai/ai-port'
import * as requestSuggestionModule from '@/data/client/ai/request-suggestion'

import { useAISuggestions } from '../use-ai-suggestions'

jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' })
}))

jest.mock('@/data/client/ai/ai-port-default', () => ({
  defaultAIPort: () => {
    throw new Error('defaultAIPort should not be used in tests')
  }
}))

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

const noopPort: AIPort = {
  async checkConnectivity() {
    return true
  },
  async requestPlan() {
    throw new Error('not used')
  },
  async alertPrompt() {
    return true
  },
  async alertError() {},
  async sleep() {}
}

describe('useAISuggestions', () => {
  let requestSpy: jest.SpyInstance

  beforeEach(() => {
    requestSpy = jest.spyOn(requestSuggestionModule, 'requestSuggestion')
  })

  afterEach(() => {
    requestSpy.mockRestore()
  })

  function renderAI() {
    return renderHook(() => useAISuggestions({ locale: 'en', port: noopPort }))
  }

  it('starts in choose view with no prior failure', () => {
    const { result } = renderAI()
    expect(result.current.view).toEqual({ kind: 'choose', lastFailure: null })
    expect(result.current.getSelectedTasks()).toEqual([])
  })

  it('start → accepted exposes plan via editing view', async () => {
    const plan = makePlan({
      maxConsecutiveRunHours: 12,
      requiredRestHours: 6,
      sources: ['https://example.com'],
      modelInfo: 'Honda XYZ',
      isGeneric: true,
      tasks: [
        {
          taskName: 'Oil',
          description: 'Change',
          triggerType: 'hours',
          triggerHoursInterval: 50,
          triggerCalendarDays: null,
          isOneTime: false
        }
      ]
    })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()

    let started: { recommendations: unknown } | undefined
    await act(async () => {
      started = await result.current.start({ model: 'M', description: '' })
    })

    expect(started).toEqual({
      recommendations: { maxConsecutiveRunHours: '12', requiredRestHours: '6' }
    })

    const view = result.current.view
    if (view.kind !== 'editing') throw new Error('expected editing view')
    expect(view.ai).toEqual({
      sources: ['https://example.com'],
      modelInfo: 'Honda XYZ',
      isGeneric: true
    })
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({ taskName: 'Oil', selected: true })
  })

  it('start → accepted with null fields returns nullable recommendations', async () => {
    const plan = makePlan({
      maxConsecutiveRunHours: null,
      requiredRestHours: 6
    })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()

    let started: { recommendations: unknown } | undefined
    await act(async () => {
      started = await result.current.start({ model: 'M', description: '' })
    })

    expect(started).toEqual({
      recommendations: { maxConsecutiveRunHours: null, requiredRestHours: '6' }
    })
  })

  it('start → offline transitions to choose view with offline failure and null recommendations', async () => {
    requestSpy.mockResolvedValue({ kind: 'offline' } as SuggestionResult)
    const { result } = renderAI()
    let started: { recommendations: unknown } | undefined
    await act(async () => {
      started = await result.current.start({ model: 'M', description: '' })
    })
    expect(started).toEqual({ recommendations: null })
    expect(result.current.view).toEqual({
      kind: 'choose',
      lastFailure: 'offline'
    })
  })

  it('start → failed transitions to choose view with error failure and null recommendations', async () => {
    requestSpy.mockResolvedValue({
      kind: 'failed',
      message: 'boom'
    } as SuggestionResult)
    const { result } = renderAI()
    let started: { recommendations: unknown } | undefined
    await act(async () => {
      started = await result.current.start({ model: 'M', description: '' })
    })
    expect(started).toEqual({ recommendations: null })
    expect(result.current.view).toEqual({
      kind: 'choose',
      lastFailure: 'error'
    })
  })

  it('start → rejected-generic returns to choose view with no failure', async () => {
    requestSpy.mockResolvedValue({
      kind: 'rejected-generic',
      plan: makePlan({ isGeneric: true })
    } as SuggestionResult)
    const { result } = renderAI()
    let started: { recommendations: unknown } | undefined
    await act(async () => {
      started = await result.current.start({ model: 'M', description: '' })
    })
    expect(started).toEqual({ recommendations: null })
    expect(result.current.view).toEqual({ kind: 'choose', lastFailure: null })
  })

  it('cancel mid-request: stale resolution does not flip view back to editing', async () => {
    let resolveResult: (r: SuggestionResult) => void = () => {}
    requestSpy.mockImplementation(
      () => new Promise<SuggestionResult>(r => (resolveResult = r))
    )
    const { result } = renderAI()

    let pending: Promise<unknown> | null = null
    act(() => {
      pending = result.current.start({ model: 'M', description: '' })
    })
    await waitFor(() => expect(result.current.view.kind).toBe('loading'))

    act(() => {
      result.current.cancel()
    })
    expect(result.current.view).toEqual({ kind: 'choose', lastFailure: null })

    await act(async () => {
      resolveResult({ kind: 'accepted', plan: makePlan() } as SuggestionResult)
      await pending
    })

    expect(result.current.view).toEqual({ kind: 'choose', lastFailure: null })
  })

  it('startManual → editing view with no AI metadata; addEmptyItem appends a blank task', () => {
    const { result } = renderAI()
    act(() => result.current.startManual())
    let view = result.current.view
    if (view.kind !== 'editing') throw new Error('expected editing view')
    expect(view.ai).toBeNull()
    expect(view.items).toEqual([])

    act(() => result.current.addEmptyItem())
    view = result.current.view
    if (view.kind !== 'editing') throw new Error('expected editing view')
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({ taskName: '', selected: true })
  })

  it('updateItem mutates only the targeted item', async () => {
    const plan = makePlan({
      tasks: [
        {
          taskName: 'A',
          description: '',
          triggerType: 'hours',
          triggerHoursInterval: 10,
          triggerCalendarDays: null,
          isOneTime: false
        },
        {
          taskName: 'B',
          description: '',
          triggerType: 'hours',
          triggerHoursInterval: 20,
          triggerCalendarDays: null,
          isOneTime: false
        }
      ]
    })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()

    await act(async () => {
      await result.current.start({ model: 'M', description: '' })
    })
    act(() => {
      result.current.updateItem(1, { selected: false })
    })

    const view = result.current.view
    if (view.kind !== 'editing') throw new Error('expected editing view')
    expect(view.items[0].selected).toBe(true)
    expect(view.items[1].selected).toBe(false)
  })

  it('getSelectedTasks returns only selected items with non-empty taskName', async () => {
    const plan = makePlan({
      tasks: [
        {
          taskName: 'A',
          description: 'desc',
          triggerType: 'hours',
          triggerHoursInterval: 50,
          triggerCalendarDays: null,
          isOneTime: false
        },
        {
          taskName: '   ',
          description: '',
          triggerType: 'hours',
          triggerHoursInterval: 10,
          triggerCalendarDays: null,
          isOneTime: false
        }
      ]
    })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()

    await act(async () => {
      await result.current.start({ model: 'M', description: '' })
    })

    act(() => {
      result.current.updateItem(0, { selected: false })
    })
    expect(result.current.getSelectedTasks()).toEqual([])

    act(() => {
      result.current.updateItem(0, { selected: true })
    })
    const tasks = result.current.getSelectedTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toEqual({
      taskName: 'A',
      description: 'desc',
      triggerType: 'hours',
      triggerHoursInterval: 50,
      triggerCalendarDays: undefined,
      isOneTime: false
    })
  })

  it('getSelectedTasks returns [] when in choose view', () => {
    const { result } = renderAI()
    expect(result.current.getSelectedTasks()).toEqual([])
  })

  it('every reachable reducer state maps to a known view kind', async () => {
    const { result } = renderAI()

    expect(result.current.view.kind).toBe('choose')

    let resolve: (r: SuggestionResult) => void = () => {}
    requestSpy.mockImplementation(
      () => new Promise<SuggestionResult>(r => (resolve = r))
    )
    let pending: Promise<unknown> | null = null
    act(() => {
      pending = result.current.start({ model: 'M', description: '' })
    })
    await waitFor(() => expect(result.current.view.kind).toBe('loading'))

    await act(async () => {
      resolve({ kind: 'offline' } as SuggestionResult)
      await pending
    })
    expect(result.current.view.kind).toBe('choose')

    requestSpy.mockResolvedValue({
      kind: 'failed',
      message: 'x'
    } as SuggestionResult)
    await act(async () => {
      await result.current.start({ model: 'M', description: '' })
    })
    expect(result.current.view.kind).toBe('choose')

    requestSpy.mockResolvedValue({
      kind: 'accepted',
      plan: makePlan()
    } as SuggestionResult)
    await act(async () => {
      await result.current.start({ model: 'M', description: '' })
    })
    expect(result.current.view.kind).toBe('editing')

    act(() => result.current.cancel())
    expect(result.current.view.kind).toBe('choose')

    act(() => result.current.startManual())
    expect(result.current.view.kind).toBe('editing')
  })
})
