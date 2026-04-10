import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import * as Network from 'expo-network'
import { Stack, useRouter } from 'expo-router'
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  PressableFeedback,
  TextField
} from 'heroui-native'
import { useRef, useState } from 'react'
import { Alert as RNAlert, Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { useTranslation } from '@/lib/i18n'
import { AiLoader } from '@/components/ai-loader'
import { AiSourcesList } from '@/components/ai-sources-list'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SuggestionCard, type EditableItem } from '@/components/suggestion-card'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createGeneratorWithMaintenance } from '@/data/client/mutations'
import { insertGeneratorSchema } from '@/data/client/validation'
import { rpcClient } from '@/data/client/rpc-client'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useLocalUser } from '@/lib/powersync'

type Step = 'basics' | 'details'
type Mode = 'ai' | 'manual' | null

export default function CreateGeneratorScreen() {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const localUser = useLocalUser()
  const { selectedOrgId } = useSelectedOrg()
  const [step, setStep] = useState<Step>('basics')
  const [mode, setMode] = useState<Mode>(null)

  const [maintenanceItems, setMaintenanceItems] = useState<EditableItem[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiSources, setAiSources] = useState<string[]>([])
  const [aiModelInfo, setAiModelInfo] = useState('')
  const [aiIsGeneric, setAiIsGeneric] = useState(false)

  const cancelledRef = useRef(false)

  const { form, submit, formError, bind } = useForm({
    initial: {
      title: '',
      model: '',
      description: '',
      maxConsecutiveRunHours: '8',
      requiredRestHours: '4',
      runWarningThresholdPct: '80'
    },
    build: values => {
      if (!localUser || !selectedOrgId) return null
      const validated = validateWithZod(insertGeneratorSchema, {
        organizationId: selectedOrgId,
        title: values.title,
        model: values.model,
        description: values.description || undefined,
        maxConsecutiveRunHours: Number(values.maxConsecutiveRunHours),
        requiredRestHours: Number(values.requiredRestHours),
        runWarningThresholdPct: Number(values.runWarningThresholdPct)
      })
      if (!validated.ok) return validated
      return {
        ok: true,
        data: { userId: localUser.id, generatorInput: validated.data }
      }
    },
    mutate: ({ userId, generatorInput }) => {
      const maintenanceInputs = maintenanceItems
        .filter(i => i.selected && i.taskName.trim())
        .map(item => ({
          taskName: item.taskName,
          description: item.description || undefined,
          triggerType: item.triggerType,
          triggerHoursInterval: item.triggerHoursInterval ?? undefined,
          triggerCalendarDays: item.triggerCalendarDays ?? undefined,
          isOneTime: item.isOneTime
        }))
      return createGeneratorWithMaintenance(
        userId,
        generatorInput,
        maintenanceInputs
      )
    },
    onSuccess: () => router.back()
  })

  function handleNext() {
    const errors: Record<string, string> = {}
    if (!form.values.title.trim()) errors.title = t('generator.titleRequired')
    if (!form.values.model.trim()) errors.model = t('generator.modelRequired')
    if (Object.keys(errors).length > 0) {
      form.setFieldErrors(errors)
      return
    }
    setStep('details')
  }

  async function handleAIMode() {
    cancelledRef.current = false
    setMode('ai')

    const networkState = await Network.getNetworkStateAsync()
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      RNAlert.alert(t('aiSuggestions.offline'), t('aiSuggestions.offlineDesc'))
      setMode(null)
      return
    }

    setIsLoadingAI(true)
    setAiIsGeneric(false)
    let timer: ReturnType<typeof setTimeout>

    const result = await Promise.race([
      rpcClient.ai.suggestMaintenancePlan({
        generatorModel: form.values.model,
        description: form.values.description || undefined,
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
    setIsLoadingAI(false)

    if (!result) {
      setMode(null)
      return
    }

    const suggestion = result

    function applyResult() {
      if (suggestion.maxConsecutiveRunHours != null)
        form.set(
          'maxConsecutiveRunHours',
          String(suggestion.maxConsecutiveRunHours)
        )
      if (suggestion.requiredRestHours != null)
        form.set('requiredRestHours', String(suggestion.requiredRestHours))

      setAiSources(suggestion.sources)
      setAiModelInfo(suggestion.modelInfo)
      setAiIsGeneric(suggestion.isGeneric)
      setMaintenanceItems(
        suggestion.tasks.map(task => ({ ...task, selected: true }))
      )
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

  function handleCancelAI() {
    cancelledRef.current = true
    setIsLoadingAI(false)
    setMode(null)
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

  const titleBinding = bind.text('title')
  const modelBinding = bind.text('model')
  const descriptionBinding = bind.text('description')
  const maxRunBinding = bind.text('maxConsecutiveRunHours')
  const restBinding = bind.text('requiredRestHours')
  const warnBinding = bind.text('runWarningThresholdPct')

  if (step === 'basics')
    return (
      <>
        <Stack.Screen
          options={{
            title: t('generator.newGenerator'),
            headerRight: () => (
              <HeaderSubmitButton
                systemImage="arrow.right"
                onPress={handleNext}
              />
            )
          }}
        />
        <KeyboardAwareScrollView
          className="bg-background flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-5 pt-6 pb-6"
          keyboardShouldPersistTaps="handled"
          bottomOffset={16}
          extraKeyboardSpace={42}
        >
          <View className="mx-auto w-full max-w-150 gap-7">
            <Text className="text-muted text-3.75 leading-5.5">
              {t('generator.addDesc')}
            </Text>

            <View className="gap-5">
              <TextField isInvalid={titleBinding.isInvalid}>
                <Label>{t('generator.title')}</Label>
                <Input
                  testID="create-gen-title-input"
                  placeholder={t('generator.titlePlaceholder')}
                  value={titleBinding.value}
                  onChangeText={titleBinding.onChangeText}
                  autoFocus
                />
                <FieldError>{titleBinding.errorMessage}</FieldError>
              </TextField>

              <TextField isInvalid={modelBinding.isInvalid}>
                <Label>{t('generator.model')}</Label>
                <Input
                  testID="create-gen-model-input"
                  placeholder={t('generator.modelPlaceholder')}
                  value={modelBinding.value}
                  onChangeText={modelBinding.onChangeText}
                />
                <FieldError>{modelBinding.errorMessage}</FieldError>
              </TextField>

              <TextField>
                <Label>{t('generator.description')}</Label>
                <Input
                  placeholder={t('generator.descriptionPlaceholder')}
                  value={descriptionBinding.value}
                  onChangeText={descriptionBinding.onChangeText}
                  multiline
                />
                <Description>{t('common.optional')}</Description>
              </TextField>
            </View>
          </View>
        </KeyboardAwareScrollView>
        <KeyboardToolbar />
      </>
    )

  // Step 2: Details
  return (
    <>
      <Stack.Screen
        options={{
          title: t('generator.generatorDetails'),
          headerLeft: () => (
            <Host matchContents>
              <SwiftButton
                label={t('generator.back')}
                systemImage="chevron.left"
                onPress={() => setStep('basics')}
                modifiers={[labelStyle('iconOnly')]}
              />
            </Host>
          ),
          headerRight: () => <HeaderSubmitButton onPress={submit} />
        }}
      />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pt-6 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <Text className="text-muted text-3.75 leading-5.5">
            {t('generator.configureDesc', { model: form.values.model })}
          </Text>

          {mode === null ? (
            <View className="gap-3">
              <PressableFeedback onPress={handleAIMode}>
                <Card>
                  <Card.Body>
                    <Card.Title>{t('generator.autoFillAI')}</Card.Title>
                    <Card.Description>
                      {t('generator.autoFillAIDesc')}
                    </Card.Description>
                  </Card.Body>
                </Card>
              </PressableFeedback>
              <PressableFeedback
                testID="create-gen-manual-mode"
                onPress={handleManualMode}
              >
                <Card>
                  <Card.Body>
                    <Card.Title>{t('generator.enterManually')}</Card.Title>
                    <Card.Description>
                      {t('generator.enterManuallyDesc')}
                    </Card.Description>
                  </Card.Body>
                </Card>
              </PressableFeedback>
            </View>
          ) : null}

          {isLoadingAI ? (
            <AiLoader
              label={t('generator.researching', { model: form.values.model })}
              onCancel={handleCancelAI}
            />
          ) : null}

          {mode !== null && !isLoadingAI ? (
            <>
              <View className="gap-5">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextField isInvalid={maxRunBinding.isInvalid}>
                      <Label>{t('generator.maxRunHours')}</Label>
                      <Input
                        placeholder="8"
                        value={maxRunBinding.value}
                        onChangeText={maxRunBinding.onChangeText}
                        keyboardType="decimal-pad"
                      />
                      <FieldError>{maxRunBinding.errorMessage}</FieldError>
                    </TextField>
                  </View>
                  <View className="flex-1">
                    <TextField isInvalid={restBinding.isInvalid}>
                      <Label>{t('generator.restHours')}</Label>
                      <Input
                        placeholder="4"
                        value={restBinding.value}
                        onChangeText={restBinding.onChangeText}
                        keyboardType="decimal-pad"
                      />
                      <FieldError>{restBinding.errorMessage}</FieldError>
                    </TextField>
                  </View>
                </View>

                <TextField isInvalid={warnBinding.isInvalid}>
                  <Label>{t('generator.warningThresholdPct')}</Label>
                  <Input
                    placeholder="80"
                    value={warnBinding.value}
                    onChangeText={warnBinding.onChangeText}
                    keyboardType="number-pad"
                  />
                  <Description>
                    {t('generator.warningThresholdDesc')}
                  </Description>
                  <FieldError>{warnBinding.errorMessage}</FieldError>
                </TextField>
              </View>

              {aiIsGeneric ? (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {t('aiSuggestions.genericWarning')}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {maintenanceItems.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-foreground text-lg font-semibold">
                    {t('generator.maintenanceTasks')}
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

              <Button variant="secondary" onPress={addEmptyMaintenanceItem}>
                {t('generator.addMaintenanceTask')}
              </Button>

              <AiSourcesList sources={aiSources} />

              <FormError message={formError} />
            </>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
