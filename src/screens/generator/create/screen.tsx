import * as Network from 'expo-network'
import { useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AiSourcesList } from '@/components/ai-sources-list'
import { SuggestionCard, type EditableItem } from '@/components/suggestion-card'
import { createGeneratorWithMaintenance } from '@/data/client/mutations'
import { insertGeneratorSchema } from '@/data/client/validation'
import { rpcClient } from '@/data/rpc-client'
import { useKeyboardHeight } from '@/lib/hooks/use-keyboard-height'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useLocalUser } from '@/lib/powersync'

type Step = 'basics' | 'details'
type Mode = 'ai' | 'manual' | null

export default function CreateGeneratorScreen() {
  const router = useRouter()
  const localUser = useLocalUser()
  const { selectedOrgId } = useSelectedOrg()
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()

  const [step, setStep] = useState<Step>('basics')
  const [mode, setMode] = useState<Mode>(null)

  const [title, setTitle] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [maxRunHours, setMaxRunHours] = useState('8')
  const [restHours, setRestHours] = useState('4')
  const [warningPct, setWarningPct] = useState('80')

  const [maintenanceItems, setMaintenanceItems] = useState<EditableItem[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiSources, setAiSources] = useState<string[]>([])
  const [aiModelInfo, setAiModelInfo] = useState('')

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleNext() {
    setFieldErrors({})
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required'
    if (!model.trim()) errors.model = 'Model is required'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setStep('details')
  }

  async function handleAIMode() {
    setMode('ai')

    const networkState = await Network.getNetworkStateAsync()
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      Alert.alert(
        'Offline',
        'Internet connection is required for AI suggestions.'
      )
      setMode(null)
      return
    }

    setIsLoadingAI(true)
    const result = await rpcClient.ai
      .suggestMaintenancePlan({
        generatorModel: model,
        description: description || undefined
      })
      .catch((err: unknown) => {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to get suggestions'
        )
        return null
      })
    setIsLoadingAI(false)

    if (!result) {
      setMode(null)
      return
    }

    if (result.maxConsecutiveRunHours != null)
      setMaxRunHours(String(result.maxConsecutiveRunHours))
    if (result.requiredRestHours != null)
      setRestHours(String(result.requiredRestHours))

    setAiSources(result.sources)
    setAiModelInfo(result.modelInfo)
    setMaintenanceItems(result.tasks.map(t => ({ ...t, selected: true })))
  }

  function handleManualMode() {
    setMode('manual')
  }

  function addEmptyMaintenanceItem() {
    setMaintenanceItems(prev => [
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
    setMaintenanceItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...update } : item))
    )
  }

  async function handleCreate() {
    if (!localUser || !selectedOrgId) return
    setError('')
    setFieldErrors({})

    const input = {
      organizationId: selectedOrgId,
      title,
      model,
      description: description || undefined,
      maxConsecutiveRunHours: parseFloat(maxRunHours) || 0,
      requiredRestHours: parseFloat(restHours) || 0,
      runWarningThresholdPct: parseInt(warningPct, 10) || 80
    }

    const parsed = insertGeneratorSchema.safeParse(input)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      const mapped: Record<string, string> = {}
      for (const [key, msgs] of Object.entries(flat))
        if (msgs?.[0]) mapped[key] = msgs[0]
      setFieldErrors(mapped)
      return
    }

    const selectedItems = maintenanceItems.filter(
      i => i.selected && i.taskName.trim()
    )
    const maintenanceInputs = selectedItems.map(item => ({
      taskName: item.taskName,
      description: item.description || undefined,
      triggerType: item.triggerType,
      triggerHoursInterval: item.triggerHoursInterval ?? undefined,
      triggerCalendarDays: item.triggerCalendarDays ?? undefined,
      isOneTime: item.isOneTime
    }))

    const result = await createGeneratorWithMaintenance(
      localUser.id,
      parsed.data,
      maintenanceInputs
    )
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.back()
  }

  const contentPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + 8 : Math.max(insets.bottom, 16)

  if (step === 'basics')
    return (
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pt-6"
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-[600px] gap-7">
          <View className="gap-2">
            <Text className="text-foreground text-3xl font-bold">
              New Generator
            </Text>
            <Text className="text-muted text-[15px] leading-[22px]">
              Add a generator to start tracking its usage and maintenance.
            </Text>
          </View>

          <View className="gap-5">
            <TextField isInvalid={!!fieldErrors.title}>
              <Label>Title</Label>
              <Input
                placeholder='e.g. "Back Yard Generator"'
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
              {fieldErrors.title ? (
                <Description className="text-danger">
                  {fieldErrors.title}
                </Description>
              ) : null}
            </TextField>

            <TextField isInvalid={!!fieldErrors.model}>
              <Label>Model</Label>
              <Input
                placeholder='e.g. "Honda EU2200i"'
                value={model}
                onChangeText={setModel}
              />
              {fieldErrors.model ? (
                <Description className="text-danger">
                  {fieldErrors.model}
                </Description>
              ) : null}
            </TextField>

            <TextField>
              <Label>Description</Label>
              <Input
                placeholder="Location, serial number, notes..."
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Description>Optional</Description>
            </TextField>
          </View>

          <Button variant="primary" onPress={handleNext}>
            Next
          </Button>
        </View>
      </ScrollView>
    )

  // Step 2: Details
  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-6"
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        <View className="gap-2">
          <Pressable onPress={() => setStep('basics')}>
            <Text className="text-sm text-blue-500">← Back</Text>
          </Pressable>
          <Text className="text-foreground text-3xl font-bold">
            Generator Details
          </Text>
          <Text className="text-muted text-[15px] leading-[22px]">
            {model} — configure specs and maintenance schedule.
          </Text>
        </View>

        {mode === null ? (
          <View className="gap-3">
            <Pressable
              onPress={handleAIMode}
              className="bg-surface-secondary rounded-2xl p-5"
            >
              <Text className="text-foreground text-base font-semibold">
                Auto-fill with AI
              </Text>
              <Text className="text-muted mt-1 text-sm leading-[20px]">
                Research your generator model and suggest specs and maintenance
                tasks automatically.
              </Text>
            </Pressable>
            <Pressable
              onPress={handleManualMode}
              className="bg-surface-secondary rounded-2xl p-5"
            >
              <Text className="text-foreground text-base font-semibold">
                Enter manually
              </Text>
              <Text className="text-muted mt-1 text-sm leading-[20px]">
                Set up generator specs and maintenance tasks yourself.
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isLoadingAI ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator />
            <Text className="text-muted text-sm">Researching {model}...</Text>
          </View>
        ) : null}

        {mode !== null && !isLoadingAI ? (
          <>
            <View className="gap-5">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField isInvalid={!!fieldErrors.maxConsecutiveRunHours}>
                    <Label>Max Run Hours</Label>
                    <Input
                      placeholder="8"
                      value={maxRunHours}
                      onChangeText={setMaxRunHours}
                      keyboardType="decimal-pad"
                    />
                    {fieldErrors.maxConsecutiveRunHours ? (
                      <Description className="text-danger">
                        {fieldErrors.maxConsecutiveRunHours}
                      </Description>
                    ) : null}
                  </TextField>
                </View>
                <View className="flex-1">
                  <TextField isInvalid={!!fieldErrors.requiredRestHours}>
                    <Label>Rest Hours</Label>
                    <Input
                      placeholder="4"
                      value={restHours}
                      onChangeText={setRestHours}
                      keyboardType="decimal-pad"
                    />
                    {fieldErrors.requiredRestHours ? (
                      <Description className="text-danger">
                        {fieldErrors.requiredRestHours}
                      </Description>
                    ) : null}
                  </TextField>
                </View>
              </View>

              <TextField isInvalid={!!fieldErrors.runWarningThresholdPct}>
                <Label>Warning Threshold %</Label>
                <Input
                  placeholder="80"
                  value={warningPct}
                  onChangeText={setWarningPct}
                  keyboardType="number-pad"
                />
                <Description>
                  Warning appears at this percentage of max run hours
                </Description>
                {fieldErrors.runWarningThresholdPct ? (
                  <Description className="text-danger">
                    {fieldErrors.runWarningThresholdPct}
                  </Description>
                ) : null}
              </TextField>
            </View>

            {maintenanceItems.length > 0 ? (
              <View className="gap-2">
                <Text className="text-foreground text-lg font-semibold">
                  Maintenance Tasks
                </Text>
                {aiModelInfo ? (
                  <Text className="text-muted text-xs">{aiModelInfo}</Text>
                ) : null}
                {maintenanceItems.map((item, index) => (
                  <SuggestionCard
                    key={index}
                    item={item}
                    onToggle={() =>
                      updateItem(index, { selected: !item.selected })
                    }
                    onUpdate={update => updateItem(index, update)}
                  />
                ))}
              </View>
            ) : null}

            {mode === 'manual' ? (
              <Button variant="secondary" onPress={addEmptyMaintenanceItem}>
                Add Maintenance Task
              </Button>
            ) : null}

            <AiSourcesList sources={aiSources} />

            {error ? (
              <Text className="bg-danger/10 text-danger rounded-2xl px-4 py-3 text-sm">
                {error}
              </Text>
            ) : null}

            <Button variant="primary" onPress={handleCreate}>
              Create Generator
            </Button>
          </>
        ) : null}
      </View>
    </ScrollView>
  )
}
