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
  now() {
    return 0
  },
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

  it('starts in idle mode with empty view-model', () => {
    const { result } = renderAI()
    expect(result.current.mode).toBe('idle')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.items).toEqual([])
    expect(result.current.sources).toEqual([])
    expect(result.current.modelInfo).toBe('')
    expect(result.current.isGeneric).toBe(false)
  })

  it('enterAIMode → accepted exposes plan via flat accessors', async () => {
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

    await act(async () => {
      await result.current.enterAIMode('M', '')
    })

    expect(result.current.mode).toBe('ai')
    expect(result.current.sources).toEqual(['https://example.com'])
    expect(result.current.modelInfo).toBe('Honda XYZ')
    expect(result.current.isGeneric).toBe(true)
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      taskName: 'Oil',
      selected: true
    })
  })

  it('applyRecommendationsTo writes both fields when present', async () => {
    const plan = makePlan({ maxConsecutiveRunHours: 12, requiredRestHours: 6 })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()
    await act(async () => {
      await result.current.enterAIMode('M', '')
    })

    const set = jest.fn()
    result.current.applyRecommendationsTo({ set })

    expect(set).toHaveBeenCalledWith('maxConsecutiveRunHours', '12')
    expect(set).toHaveBeenCalledWith('requiredRestHours', '6')
  })

  it('applyRecommendationsTo skips null fields from plan', async () => {
    const plan = makePlan({
      maxConsecutiveRunHours: null,
      requiredRestHours: 6
    })
    requestSpy.mockResolvedValue({ kind: 'accepted', plan } as SuggestionResult)
    const { result } = renderAI()
    await act(async () => {
      await result.current.enterAIMode('M', '')
    })

    const set = jest.fn()
    result.current.applyRecommendationsTo({ set })

    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith('requiredRestHours', '6')
  })

  it('applyRecommendationsTo is a no-op outside ai mode', () => {
    const { result } = renderAI()
    const set = jest.fn()
    result.current.applyRecommendationsTo({ set })
    expect(set).not.toHaveBeenCalled()
  })

  it('enterAIMode → offline transitions to offline mode', async () => {
    requestSpy.mockResolvedValue({ kind: 'offline' } as SuggestionResult)
    const { result } = renderAI()
    await act(async () => {
      await result.current.enterAIMode('M', '')
    })
    expect(result.current.mode).toBe('offline')
  })

  it('enterAIMode → failed transitions to error mode', async () => {
    requestSpy.mockResolvedValue({
      kind: 'failed',
      message: 'boom'
    } as SuggestionResult)
    const { result } = renderAI()
    await act(async () => {
      await result.current.enterAIMode('M', '')
    })
    expect(result.current.mode).toBe('error')
  })

  it('enterAIMode → rejected-generic returns to idle', async () => {
    requestSpy.mockResolvedValue({
      kind: 'rejected-generic',
      plan: makePlan({ isGeneric: true })
    } as SuggestionResult)
    const { result } = renderAI()
    await act(async () => {
      await result.current.enterAIMode('M', '')
    })
    expect(result.current.mode).toBe('idle')
  })

  it('cancel mid-request: stale resolution does not flip mode back to ai', async () => {
    let resolveResult: (r: SuggestionResult) => void = () => {}
    requestSpy.mockImplementation(
      () => new Promise<SuggestionResult>(r => (resolveResult = r))
    )
    const { result } = renderAI()

    let pending: Promise<unknown> | null = null
    act(() => {
      pending = result.current.enterAIMode('M', '')
    })
    await waitFor(() => expect(result.current.mode).toBe('requesting'))

    act(() => {
      result.current.cancel()
    })
    expect(result.current.mode).toBe('idle')

    await act(async () => {
      resolveResult({ kind: 'accepted', plan: makePlan() } as SuggestionResult)
      await pending
    })

    expect(result.current.mode).toBe('idle')
  })

  it('manual mode: enterManualMode → addEmptyItem appends a blank task', () => {
    const { result } = renderAI()
    act(() => result.current.enterManualMode())
    expect(result.current.mode).toBe('manual')

    act(() => result.current.addEmptyItem())
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      taskName: '',
      selected: true
    })
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
      await result.current.enterAIMode('M', '')
    })
    act(() => {
      result.current.updateItem(1, { selected: false })
    })

    expect(result.current.items[0].selected).toBe(true)
    expect(result.current.items[1].selected).toBe(false)
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
      await result.current.enterAIMode('M', '')
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

  it('getSelectedTasks returns [] when in idle mode', () => {
    const { result } = renderAI()
    expect(result.current.getSelectedTasks()).toEqual([])
  })
})
