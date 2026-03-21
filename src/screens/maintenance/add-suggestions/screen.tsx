import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { useTranslation } from '@/lib/i18n'
import { AiSourcesList } from '@/components/ai-sources-list'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SuggestionCard, type EditableItem } from '@/components/suggestion-card'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createManyMaintenanceTemplates } from '@/data/client/mutations'
import type { InsertMaintenanceTemplateInput } from '@/data/client/validation'
import { notifySuccess } from '@/lib/haptics'
import { consumePendingSuggestions } from '@/lib/maintenance/suggestions-store'
import { useLocalUser } from '@/lib/powersync'

export default function AddSuggestionsScreen() {
  const { t } = useTranslation()
  const { generatorId } = useLocalSearchParams<{ generatorId: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const [data] = useState(() => consumePendingSuggestions())
  const [items, setItems] = useState<EditableItem[]>(
    () => data?.tasks.map(s => ({ ...s, selected: true })) ?? []
  )
  const [isSaving, setIsSaving] = useState(false)

  if (!data || !generatorId)
    return (
      <>
        <Stack.Screen options={{ title: t('aiSuggestions.title') }} />
        <View className="bg-background flex-1 items-center justify-center">
          <Text className="text-muted text-sm">
            {t('aiSuggestions.noSuggestions')}
          </Text>
        </View>
      </>
    )

  const selectedCount = items.filter(i => i.selected).length

  function updateItem(index: number, update: Partial<EditableItem>) {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...update } : item))
    )
  }

  async function handleSave() {
    if (!localUser || !generatorId) return
    const selected = items.filter(i => i.selected)
    if (selected.length === 0) return

    const inputs: InsertMaintenanceTemplateInput[] = selected.map(item => ({
      generatorId,
      taskName: item.taskName,
      description: item.description || undefined,
      triggerType: item.triggerType,
      triggerHoursInterval: item.triggerHoursInterval ?? undefined,
      triggerCalendarDays: item.triggerCalendarDays ?? undefined,
      isOneTime: item.isOneTime
    }))

    setIsSaving(true)
    const result = await createManyMaintenanceTemplates(localUser.id, inputs)
    setIsSaving(false)

    if (!result.ok) {
      Alert.alert(t('common.error'), result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderSubmitButton
              onPress={handleSave}
              isDisabled={selectedCount === 0 || isSaving}
            />
          )
        }}
      />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-150 gap-4">
          <Text className="text-muted text-xs">{data.modelInfo}</Text>

          {items.map((item, index) => (
            <SuggestionCard
              key={index}
              item={item}
              onToggle={() => updateItem(index, { selected: !item.selected })}
              onUpdate={update => updateItem(index, update)}
            />
          ))}

          <AiSourcesList sources={data.sources} className="mt-2" />
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
