import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
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
import { useState } from 'react'
import { Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { useTranslation } from '@/lib/i18n'
import { AiLoader } from '@/components/ai-loader'
import { AiSourcesList } from '@/components/ai-sources-list'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { SuggestionCard } from '@/components/suggestion-card'
import type { EditableItem } from '@/components/suggestion-card'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createGeneratorWithMaintenance } from '@/data/client/mutations'
import { insertGeneratorSchema } from '@/data/shared/validation'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import type { TextBinding } from '@/lib/hooks/forms/bind-field'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useLocalUser } from '@/lib/powersync'

import { useAISuggestions } from './lib/use-ai-suggestions'

type Step = 'basics' | 'details'

export default function CreateGeneratorScreen() {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const localUser = useLocalUser()
  const { selectedOrgId } = useSelectedOrg()
  const [step, setStep] = useState<Step>('basics')

  const ai = useAISuggestions({ locale })

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
    mutate: ({ userId, generatorInput }) =>
      createGeneratorWithMaintenance(
        userId,
        generatorInput,
        ai.getSelectedTasks()
      ),
    onSuccess: () => router.back()
  })

  async function startAI() {
    const { recommendations } = await ai.start({
      model: form.values.model,
      description: form.values.description
    })
    if (recommendations?.maxConsecutiveRunHours != null)
      form.set('maxConsecutiveRunHours', recommendations.maxConsecutiveRunHours)
    if (recommendations?.requiredRestHours != null)
      form.set('requiredRestHours', recommendations.requiredRestHours)
  }

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

  const titleBinding = bind.text('title')
  const modelBinding = bind.text('model')
  const descriptionBinding = bind.text('description')
  const maxRunBinding = bind.text('maxConsecutiveRunHours')
  const restBinding = bind.text('requiredRestHours')
  const warnBinding = bind.text('runWarningThresholdPct')

  function renderBody() {
    const view = ai.view
    switch (view.kind) {
      case 'choose':
        return (
          <ChooseBlock
            lastFailure={view.lastFailure}
            onAI={startAI}
            onManual={ai.startManual}
          />
        )
      case 'loading':
        return (
          <AiLoader
            label={t('generator.researching', { model: form.values.model })}
            onCancel={ai.cancel}
          />
        )
      case 'editing':
        return (
          <EditingBlock
            items={view.items}
            ai={view.ai}
            maxRunBinding={maxRunBinding}
            restBinding={restBinding}
            warnBinding={warnBinding}
            onAddItem={ai.addEmptyItem}
            onUpdateItem={ai.updateItem}
            formError={formError}
          />
        )
      default:
        throw new Error(
          `Unhandled AI view: ${JSON.stringify(view satisfies never)}`
        )
    }
  }

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

          {renderBody()}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}

function ChooseBlock({
  lastFailure,
  onAI,
  onManual
}: {
  lastFailure: 'offline' | 'error' | null
  onAI: () => void
  onManual: () => void
}) {
  const { t } = useTranslation()
  return (
    <View className="gap-3">
      {lastFailure !== null ? (
        <Alert status={lastFailure === 'offline' ? 'warning' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t(
                lastFailure === 'offline'
                  ? 'generator.aiOfflineRetry'
                  : 'generator.aiErrorRetry'
              )}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <PressableFeedback onPress={onAI}>
        <Card>
          <Card.Body>
            <Card.Title>{t('generator.autoFillAI')}</Card.Title>
            <Card.Description>{t('generator.autoFillAIDesc')}</Card.Description>
          </Card.Body>
        </Card>
      </PressableFeedback>
      <PressableFeedback testID="create-gen-manual-mode" onPress={onManual}>
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
  )
}

interface EditingBlockProps {
  items: EditableItem[]
  ai: { sources: string[]; modelInfo: string; isGeneric: boolean } | null
  maxRunBinding: TextBinding
  restBinding: TextBinding
  warnBinding: TextBinding
  onAddItem: () => void
  onUpdateItem: (index: number, update: Partial<EditableItem>) => void
  formError: string
}

function EditingBlock({
  items,
  ai,
  maxRunBinding,
  restBinding,
  warnBinding,
  onAddItem,
  onUpdateItem,
  formError
}: EditingBlockProps) {
  const { t } = useTranslation()
  return (
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
          <Description>{t('generator.warningThresholdDesc')}</Description>
          <FieldError>{warnBinding.errorMessage}</FieldError>
        </TextField>
      </View>

      {ai?.isGeneric ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t('aiSuggestions.genericWarning')}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {items.length > 0 ? (
        <View className="gap-2">
          <Text className="text-foreground text-lg font-semibold">
            {t('generator.maintenanceTasks')}
          </Text>
          {ai?.modelInfo ? (
            <Text className="text-muted text-xs">{ai.modelInfo}</Text>
          ) : null}
          {items.map((item, index) => (
            <SuggestionCard
              key={index}
              item={item}
              onToggle={() => onUpdateItem(index, { selected: !item.selected })}
              onUpdate={update => onUpdateItem(index, update)}
            />
          ))}
        </View>
      ) : null}

      <Button variant="secondary" onPress={onAddItem}>
        {t('generator.addMaintenanceTask')}
      </Button>

      <AiSourcesList sources={ai?.sources ?? []} />

      <FormError message={formError} />
    </>
  )
}
