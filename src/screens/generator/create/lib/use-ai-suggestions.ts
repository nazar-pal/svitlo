import { useReducer, useRef } from 'react'

import type { EditableItem } from '@/components/suggestion-card'
import { defaultAIPort } from '@/data/client/ai/ai-port-default'
import type {
  AIPort,
  OrchestratorCopy,
  SuggestionPlan
} from '@/data/client/ai/ai-port'
import { requestSuggestion } from '@/data/client/ai/request-suggestion'
import type { InsertMaintenanceTemplateInput } from '@/data/shared/validation'
import type { AppLocale } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

type MaintenanceInput = Omit<InsertMaintenanceTemplateInput, 'generatorId'>

export type AIMode =
  | 'idle'
  | 'requesting'
  | 'offline'
  | 'error'
  | 'manual'
  | 'ai'

interface SetField {
  (field: 'maxConsecutiveRunHours', value: string): void
  (field: 'requiredRestHours', value: string): void
}

interface ApplyTarget {
  set: SetField
}

export interface UseAISuggestionsReturn {
  mode: AIMode
  isLoading: boolean
  sources: string[]
  modelInfo: string
  isGeneric: boolean
  items: EditableItem[]
  enterAIMode: (model: string, description: string) => Promise<void>
  enterManualMode: () => void
  cancel: () => void
  addEmptyItem: () => void
  updateItem: (index: number, update: Partial<EditableItem>) => void
  getSelectedTasks: () => MaintenanceInput[]
  applyRecommendationsTo: (form: ApplyTarget) => void
}

interface UseAISuggestionsParams {
  locale: AppLocale
  port?: AIPort
}

interface Recommendations {
  maxRunHours: string | null
  restHours: string | null
}

type State =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'offline' }
  | { kind: 'error' }
  | { kind: 'manual'; items: EditableItem[] }
  | {
      kind: 'ai'
      sources: string[]
      modelInfo: string
      isGeneric: boolean
      recommendations: Recommendations
      items: EditableItem[]
    }

type Action =
  | { type: 'request_start' }
  | { type: 'request_offline' }
  | { type: 'request_error' }
  | { type: 'request_rejected_generic' }
  | { type: 'request_accepted'; plan: SuggestionPlan }
  | { type: 'enter_manual' }
  | { type: 'cancel' }
  | { type: 'add_empty_item' }
  | { type: 'update_item'; index: number; update: Partial<EditableItem> }

const EMPTY_ITEM: EditableItem = {
  taskName: '',
  description: '',
  triggerType: 'hours',
  triggerHoursInterval: null,
  triggerCalendarDays: null,
  isOneTime: false,
  selected: true
}

function recommendationsFromPlan(plan: SuggestionPlan): Recommendations {
  return {
    maxRunHours:
      plan.maxConsecutiveRunHours != null
        ? String(plan.maxConsecutiveRunHours)
        : null,
    restHours:
      plan.requiredRestHours != null ? String(plan.requiredRestHours) : null
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'request_start':
      return { kind: 'requesting' }
    case 'request_offline':
      return { kind: 'offline' }
    case 'request_error':
      return { kind: 'error' }
    case 'request_rejected_generic':
      return { kind: 'idle' }
    case 'request_accepted': {
      const { plan } = action
      return {
        kind: 'ai',
        sources: plan.sources,
        modelInfo: plan.modelInfo,
        isGeneric: plan.isGeneric,
        recommendations: recommendationsFromPlan(plan),
        items: plan.tasks.map(task => ({ ...task, selected: true }))
      }
    }
    case 'enter_manual':
      if (state.kind === 'manual') return state
      return { kind: 'manual', items: [] }
    case 'cancel':
      return { kind: 'idle' }
    case 'add_empty_item':
      if (state.kind === 'manual' || state.kind === 'ai')
        return { ...state, items: [...state.items, EMPTY_ITEM] }
      return state
    case 'update_item': {
      if (state.kind !== 'ai' && state.kind !== 'manual') return state
      const items = state.items.map((item, i) =>
        i === action.index ? { ...item, ...action.update } : item
      )
      return { ...state, items }
    }
    default:
      throw new Error(
        `Unhandled AI action: ${JSON.stringify(action satisfies never)}`
      )
  }
}

function itemsOf(state: State): EditableItem[] {
  if (state.kind === 'ai' || state.kind === 'manual') return state.items
  return []
}

export function useAISuggestions({
  locale,
  port
}: UseAISuggestionsParams): UseAISuggestionsReturn {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, { kind: 'idle' })

  const portRef = useRef<AIPort>(port ?? defaultAIPort())
  const controllerRef = useRef<AbortController | null>(null)

  function buildCopy(): OrchestratorCopy {
    return {
      offline: {
        title: t('aiSuggestions.offline'),
        message: t('aiSuggestions.offlineDesc')
      },
      timeoutMessage: t('aiSuggestions.timeout'),
      fallbackErrorMessage: t('aiSuggestions.failedToGet'),
      errorTitle: t('common.error'),
      genericPrompt: {
        title: t('aiSuggestions.genericTitle'),
        message: t('aiSuggestions.genericPrompt'),
        confirmLabel: t('aiSuggestions.useTemplate'),
        cancelLabel: t('aiSuggestions.noThanks')
      }
    }
  }

  async function enterAIMode(
    model: string,
    description: string
  ): Promise<void> {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    dispatch({ type: 'request_start' })

    const result = await requestSuggestion({
      request: {
        generatorModel: model,
        description: description || undefined,
        locale
      },
      port: portRef.current,
      copy: buildCopy(),
      signal: controller.signal
    })

    if (controllerRef.current !== controller) return

    switch (result.kind) {
      case 'cancelled':
        return
      case 'offline':
        dispatch({ type: 'request_offline' })
        return
      case 'failed':
        dispatch({ type: 'request_error' })
        return
      case 'rejected-generic':
        dispatch({ type: 'request_rejected_generic' })
        return
      case 'accepted':
        dispatch({ type: 'request_accepted', plan: result.plan })
        return
      default:
        throw new Error(`Unhandled SuggestionResult: ${result satisfies never}`)
    }
  }

  function enterManualMode() {
    dispatch({ type: 'enter_manual' })
  }

  function cancel() {
    controllerRef.current?.abort()
    controllerRef.current = null
    dispatch({ type: 'cancel' })
  }

  function addEmptyItem() {
    dispatch({ type: 'add_empty_item' })
  }

  function updateItem(index: number, update: Partial<EditableItem>) {
    dispatch({ type: 'update_item', index, update })
  }

  function getSelectedTasks(): MaintenanceInput[] {
    return itemsOf(state)
      .filter(i => i.selected && i.taskName.trim())
      .map(item => ({
        taskName: item.taskName,
        description: item.description || undefined,
        triggerType: item.triggerType,
        triggerHoursInterval: item.triggerHoursInterval ?? undefined,
        triggerCalendarDays: item.triggerCalendarDays ?? undefined,
        isOneTime: item.isOneTime
      }))
  }

  function applyRecommendationsTo(form: ApplyTarget) {
    if (state.kind !== 'ai') return
    const { maxRunHours, restHours } = state.recommendations
    if (maxRunHours !== null) form.set('maxConsecutiveRunHours', maxRunHours)
    if (restHours !== null) form.set('requiredRestHours', restHours)
  }

  return {
    mode: state.kind,
    isLoading: state.kind === 'requesting',
    sources: state.kind === 'ai' ? state.sources : [],
    modelInfo: state.kind === 'ai' ? state.modelInfo : '',
    isGeneric: state.kind === 'ai' ? state.isGeneric : false,
    items: itemsOf(state),
    enterAIMode,
    enterManualMode,
    cancel,
    addEmptyItem,
    updateItem,
    getSelectedTasks,
    applyRecommendationsTo
  }
}
