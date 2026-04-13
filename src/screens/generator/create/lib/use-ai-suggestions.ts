import { useRef, useState } from 'react'

import type { EditableItem } from '@/components/suggestion-card'
import { defaultAIPort } from '@/data/client/ai/ai-port-default'
import type { AIPort, OrchestratorCopy } from '@/data/client/ai/ai-port'
import { requestSuggestion } from '@/data/client/ai/request-suggestion'
import type { InsertMaintenanceTemplateInput } from '@/data/shared/validation'
import type { AppLocale } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

export type AIMode =
  | 'idle'
  | 'requesting'
  | 'ai'
  | 'manual'
  | 'error'
  | 'offline'

type MaintenanceInput = Omit<InsertMaintenanceTemplateInput, 'generatorId'>

interface UseAISuggestionsParams {
  locale: AppLocale
  port?: AIPort
}

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
  recommendedMaxRunHours: string | null
  recommendedRestHours: string | null
  items: EditableItem[]
  addEmptyItem: () => void
  updateItem: (index: number, update: Partial<EditableItem>) => void
  enterAIMode: (model: string, description: string) => Promise<void>
  enterManualMode: () => void
  cancel: () => void
  getSelectedTasks: () => MaintenanceInput[]
  applyRecommendationsTo: (form: ApplyTarget) => void
}

export function useAISuggestions({
  locale,
  port
}: UseAISuggestionsParams): UseAISuggestionsReturn {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AIMode>('idle')
  const [sources, setSources] = useState<string[]>([])
  const [modelInfo, setModelInfo] = useState('')
  const [isGeneric, setIsGeneric] = useState(false)
  const [recommendedMaxRunHours, setRecommendedMaxRunHours] = useState<
    string | null
  >(null)
  const [recommendedRestHours, setRecommendedRestHours] = useState<
    string | null
  >(null)
  const [items, setItems] = useState<EditableItem[]>([])

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

  async function enterAIMode(model: string, description: string) {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setMode('requesting')
    setIsGeneric(false)

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
        setMode('offline')
        return
      case 'failed':
        setMode('error')
        return
      case 'rejected-generic':
        setMode('idle')
        return
      case 'accepted': {
        const { plan } = result
        setSources(plan.sources)
        setModelInfo(plan.modelInfo)
        setIsGeneric(plan.isGeneric)
        setRecommendedMaxRunHours(
          plan.maxConsecutiveRunHours != null
            ? String(plan.maxConsecutiveRunHours)
            : null
        )
        setRecommendedRestHours(
          plan.requiredRestHours != null ? String(plan.requiredRestHours) : null
        )
        setItems(plan.tasks.map(task => ({ ...task, selected: true })))
        setMode('ai')
        return
      }
      default:
        throw new Error(`Unhandled SuggestionResult: ${result satisfies never}`)
    }
  }

  function enterManualMode() {
    setMode('manual')
  }

  function cancel() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setMode('idle')
  }

  function addEmptyItem() {
    setItems(prev => [
      ...prev,
      {
        taskName: '',
        description: '',
        triggerType: 'hours',
        triggerHoursInterval: null,
        triggerCalendarDays: null,
        isOneTime: false,
        selected: true
      }
    ])
  }

  function updateItem(index: number, update: Partial<EditableItem>) {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...update } : item))
    )
  }

  function getSelectedTasks(): MaintenanceInput[] {
    return items
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
    if (recommendedMaxRunHours !== null)
      form.set('maxConsecutiveRunHours', recommendedMaxRunHours)
    if (recommendedRestHours !== null)
      form.set('requiredRestHours', recommendedRestHours)
  }

  return {
    mode,
    isLoading: mode === 'requesting',
    sources,
    modelInfo,
    isGeneric,
    recommendedMaxRunHours,
    recommendedRestHours,
    items,
    addEmptyItem,
    updateItem,
    enterAIMode,
    enterManualMode,
    cancel,
    getSelectedTasks,
    applyRecommendationsTo
  }
}
