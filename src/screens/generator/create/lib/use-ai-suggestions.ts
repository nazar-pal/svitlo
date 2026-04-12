import * as Network from 'expo-network'
import { useRef, useState } from 'react'
import { Alert as RNAlert } from 'react-native'

import type { AppLocale } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import type { EditableItem } from '@/components/suggestion-card'
import { rpcClient } from '@/data/client/rpc-client'

interface UseAISuggestionsParams {
  locale: AppLocale
  onApply: (values: {
    maxConsecutiveRunHours: string | null
    requiredRestHours: string | null
  }) => void
}

interface UseAISuggestionsReturn {
  mode: 'ai' | 'manual' | null
  isLoading: boolean
  sources: string[]
  modelInfo: string
  isGeneric: boolean
  items: EditableItem[]
  enterAIMode: (model: string, description: string) => void
  enterManualMode: () => void
  cancel: () => void
  addEmptyItem: () => void
  updateItem: (index: number, update: Partial<EditableItem>) => void
}

export function useAISuggestions({
  locale,
  onApply
}: UseAISuggestionsParams): UseAISuggestionsReturn {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'ai' | 'manual' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sources, setSources] = useState<string[]>([])
  const [modelInfo, setModelInfo] = useState('')
  const [isGeneric, setIsGeneric] = useState(false)
  const [items, setItems] = useState<EditableItem[]>([])
  const cancelledRef = useRef(false)

  async function enterAIMode(model: string, description: string) {
    cancelledRef.current = false
    setMode('ai')

    const networkState = await Network.getNetworkStateAsync()
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      RNAlert.alert(t('aiSuggestions.offline'), t('aiSuggestions.offlineDesc'))
      setMode(null)
      return
    }

    setIsLoading(true)
    setIsGeneric(false)
    let timer: ReturnType<typeof setTimeout>

    const result = await Promise.race([
      rpcClient.ai.suggestMaintenancePlan({
        generatorModel: model,
        description: description || undefined,
        locale
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(t('aiSuggestions.timeout'))),
          45_000
        )
      })
    ])
      .finally(() => clearTimeout(timer))
      .catch((err: unknown) => {
        if (cancelledRef.current) return null
        RNAlert.alert(
          t('common.error'),
          err instanceof Error ? err.message : t('aiSuggestions.failedToGet')
        )
        return null
      })

    if (cancelledRef.current) return
    setIsLoading(false)

    if (!result) {
      setMode(null)
      return
    }

    const suggestion = result

    function applyResult() {
      onApply({
        maxConsecutiveRunHours:
          suggestion.maxConsecutiveRunHours != null
            ? String(suggestion.maxConsecutiveRunHours)
            : null,
        requiredRestHours:
          suggestion.requiredRestHours != null
            ? String(suggestion.requiredRestHours)
            : null
      })

      setSources(suggestion.sources)
      setModelInfo(suggestion.modelInfo)
      setIsGeneric(suggestion.isGeneric)
      setItems(suggestion.tasks.map(task => ({ ...task, selected: true })))
    }

    if (suggestion.isGeneric) {
      RNAlert.alert(
        t('aiSuggestions.genericTitle'),
        t('aiSuggestions.genericPrompt'),
        [
          { text: t('aiSuggestions.noThanks'), style: 'cancel' },
          { text: t('aiSuggestions.useTemplate'), onPress: applyResult }
        ]
      )
    } else {
      applyResult()
    }
  }

  function enterManualMode() {
    setMode('manual')
  }

  function cancel() {
    cancelledRef.current = true
    setIsLoading(false)
    setMode(null)
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

  return {
    mode,
    isLoading,
    sources,
    modelInfo,
    isGeneric,
    items,
    enterAIMode,
    enterManualMode,
    cancel,
    addEmptyItem,
    updateItem
  }
}
