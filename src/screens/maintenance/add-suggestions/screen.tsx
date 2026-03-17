import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { AiSourcesList } from '@/components/ai-sources-list'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { SuggestionCard, type EditableItem } from '@/components/suggestion-card'
import { createManyMaintenanceTemplates } from '@/data/client/mutations'
import type { InsertMaintenanceTemplateInput } from '@/data/client/validation'
import { useLocalUser } from '@/lib/powersync'
import { consumePendingSuggestions } from '@/lib/maintenance/suggestions-store'

export default function AddSuggestionsScreen() {
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
        <Stack.Screen options={{ title: 'AI Suggestions' }} />
        <View className="bg-background flex-1 items-center justify-center">
          <Text className="text-muted text-sm">No suggestions available</Text>
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
      Alert.alert('Error', result.error)
      return
    }

    router.back()
  }

  return (
    <>
      <Stack.Screen options={{ title: 'AI Suggestions' }} />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-[600px] gap-4">
          <View className="gap-1">
            <Text className="text-foreground text-3xl font-bold">
              AI Suggestions
            </Text>
            <Text className="text-muted text-xs">{data.modelInfo}</Text>
          </View>

          {items.map((item, index) => (
            <SuggestionCard
              key={index}
              item={item}
              onToggle={() => updateItem(index, { selected: !item.selected })}
              onUpdate={update => updateItem(index, update)}
            />
          ))}

          <AiSourcesList sources={data.sources} className="mt-2" />

          <Button
            variant="primary"
            isDisabled={selectedCount === 0 || isSaving}
            onPress={handleSave}
          >
            {isSaving
              ? 'Saving...'
              : selectedCount === 0
                ? 'Select items to save'
                : `Save ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}`}
          </Button>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
