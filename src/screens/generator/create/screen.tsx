import * as Network from 'expo-network'
import { useRouter } from 'expo-router'
import {
  Alert as HeroAlert,
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  PressableFeedback,
  Spinner,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { Alert as RNAlert, Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { AiSourcesList } from '@/components/ai-sources-list'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { SuggestionCard, type EditableItem } from '@/components/suggestion-card'
import { createGeneratorWithMaintenance } from '@/data/client/mutations'
import { notifySuccess } from '@/lib/haptics'
import {
  flattenZodErrors,
  insertGeneratorSchema
} from '@/data/client/validation'
import { rpcClient } from '@/data/rpc-client'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useLocalUser } from '@/lib/powersync'

type Step = 'basics' | 'details'
type Mode = 'ai' | 'manual' | null

export default function CreateGeneratorScreen() {
  const router = useRouter()
  const localUser = useLocalUser()
  const { selectedOrgId } = useSelectedOrg()
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
      RNAlert.alert(
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
        RNAlert.alert(
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
      setFieldErrors(flattenZodErrors(parsed.error))
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

    notifySuccess()
    router.back()
  }

  if (step === 'basics')
    return (
      <>
        <KeyboardAwareScrollView
          className="bg-background flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-5 pt-6 pb-6"
          keyboardShouldPersistTaps="handled"
          bottomOffset={16}
          extraKeyboardSpace={42}
        >
          <View className="mx-auto w-full max-w-150 gap-7">
            <View className="gap-2">
              <Text className="text-foreground text-3xl font-bold">
                New Generator
              </Text>
              <Text className="text-muted text-3.75 leading-5.5">
                Add a generator to start tracking its usage and maintenance.
              </Text>
            </View>

            <View className="gap-5">
              <TextField isInvalid={!!fieldErrors.title}>
                <Label>Title</Label>
                <Input
                  placeholder='e.g. "Back Yard Generator"'
                  value={title}
                  onChangeText={v => {
                    setTitle(v)
                    if (fieldErrors.title)
                      setFieldErrors(({ title: _, ...rest }) => rest)
                  }}
                  autoFocus
                />
                <FieldError>{fieldErrors.title}</FieldError>
              </TextField>

              <TextField isInvalid={!!fieldErrors.model}>
                <Label>Model</Label>
                <Input
                  placeholder='e.g. "Honda EU2200i"'
                  value={model}
                  onChangeText={v => {
                    setModel(v)
                    if (fieldErrors.model)
                      setFieldErrors(({ model: _, ...rest }) => rest)
                  }}
                />
                <FieldError>{fieldErrors.model}</FieldError>
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
        </KeyboardAwareScrollView>
        <KeyboardToolbar />
      </>
    )

  // Step 2: Details
  return (
    <>
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pt-6 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <View className="gap-2">
            <Button size="sm" variant="ghost" onPress={() => setStep('basics')}>
              ← Back
            </Button>
            <Text className="text-foreground text-3xl font-bold">
              Generator Details
            </Text>
            <Text className="text-muted text-3.75 leading-5.5">
              {model} — configure specs and maintenance schedule.
            </Text>
          </View>

          {mode === null ? (
            <View className="gap-3">
              <PressableFeedback onPress={handleAIMode}>
                <Card>
                  <Card.Body>
                    <Card.Title>Auto-fill with AI</Card.Title>
                    <Card.Description>
                      Research your generator model and suggest specs and
                      maintenance tasks automatically.
                    </Card.Description>
                  </Card.Body>
                </Card>
              </PressableFeedback>
              <PressableFeedback onPress={handleManualMode}>
                <Card>
                  <Card.Body>
                    <Card.Title>Enter manually</Card.Title>
                    <Card.Description>
                      Set up generator specs and maintenance tasks yourself.
                    </Card.Description>
                  </Card.Body>
                </Card>
              </PressableFeedback>
            </View>
          ) : null}

          {isLoadingAI ? (
            <View className="items-center gap-3 py-10">
              <Spinner />
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
                        onChangeText={v => {
                          setMaxRunHours(v)
                          if (fieldErrors.maxConsecutiveRunHours)
                            setFieldErrors(
                              ({ maxConsecutiveRunHours: _, ...rest }) => rest
                            )
                        }}
                        keyboardType="decimal-pad"
                      />
                      <FieldError>
                        {fieldErrors.maxConsecutiveRunHours}
                      </FieldError>
                    </TextField>
                  </View>
                  <View className="flex-1">
                    <TextField isInvalid={!!fieldErrors.requiredRestHours}>
                      <Label>Rest Hours</Label>
                      <Input
                        placeholder="4"
                        value={restHours}
                        onChangeText={v => {
                          setRestHours(v)
                          if (fieldErrors.requiredRestHours)
                            setFieldErrors(
                              ({ requiredRestHours: _, ...rest }) => rest
                            )
                        }}
                        keyboardType="decimal-pad"
                      />
                      <FieldError>{fieldErrors.requiredRestHours}</FieldError>
                    </TextField>
                  </View>
                </View>

                <TextField isInvalid={!!fieldErrors.runWarningThresholdPct}>
                  <Label>Warning Threshold %</Label>
                  <Input
                    placeholder="80"
                    value={warningPct}
                    onChangeText={v => {
                      setWarningPct(v)
                      if (fieldErrors.runWarningThresholdPct)
                        setFieldErrors(
                          ({ runWarningThresholdPct: _, ...rest }) => rest
                        )
                    }}
                    keyboardType="number-pad"
                  />
                  <Description>
                    Warning appears at this percentage of max run hours
                  </Description>
                  <FieldError>{fieldErrors.runWarningThresholdPct}</FieldError>
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
                <HeroAlert status="danger">
                  <HeroAlert.Indicator />
                  <HeroAlert.Content>
                    <HeroAlert.Description>{error}</HeroAlert.Description>
                  </HeroAlert.Content>
                </HeroAlert>
              ) : null}

              <Button variant="primary" onPress={handleCreate}>
                Create Generator
              </Button>
            </>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
