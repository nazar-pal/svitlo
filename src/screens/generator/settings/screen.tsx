import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { Alert, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import {
  assignUserToGenerator,
  deleteGenerator,
  unassignUserFromGenerator,
  updateGenerator
} from '@/data/client/mutations'
import type { Generator } from '@/data/client/db-schema'
import {
  getAllUsers,
  getGenerator,
  getGeneratorAssignments,
  getOrgMembers
} from '@/data/client/queries'
import { updateGeneratorSchema } from '@/data/shared/validation'
import { runMutation } from '@/lib/alerts'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'
import { getUserName } from '@/lib/utils/get-user-name'

import { useTranslation } from '@/lib/i18n'
import { AssignedMembersSection } from '@/components/assigned-members-section'

export default function GeneratorSettingsScreen() {
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const { data: gens } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = gens[0]
  if (!generator) return null

  return <SettingsForm generator={generator} />
}

function SettingsForm({ generator }: { generator: Generator }) {
  const { t } = useTranslation()
  const router = useRouter()
  const localUser = useLocalUser()
  const userId = localUser?.id ?? ''
  const generatorId = generator.id

  const { data: assignments } = useDrizzleQuery(
    getGeneratorAssignments(generatorId)
  )
  const { data: users } = useDrizzleQuery(getAllUsers())
  const { data: orgMembers } = useDrizzleQuery(
    getOrgMembers(generator.organizationId)
  )

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: {
      title: generator.title,
      model: generator.model,
      description: generator.description ?? '',
      maxConsecutiveRunHours: String(generator.maxConsecutiveRunHours),
      requiredRestHours: String(generator.requiredRestHours),
      runWarningThresholdPct: String(generator.runWarningThresholdPct)
    },
    shortCircuit: state => !state.isDirty,
    build: values =>
      validateWithZod(updateGeneratorSchema, {
        title: values.title,
        model: values.model,
        description: values.description || null,
        maxConsecutiveRunHours: Number(values.maxConsecutiveRunHours),
        requiredRestHours: Number(values.requiredRestHours),
        runWarningThresholdPct: Number(values.runWarningThresholdPct)
      }),
    mutate: input => updateGenerator(userId, generatorId, input),
    onSuccess: () => router.back()
  })

  const assignedUserIds = new Set(assignments.map(a => a.userId))
  const unassignedMembers = orgMembers.filter(
    m => !assignedUserIds.has(m.userId)
  )

  const resolveUserName = (uid: string) => getUserName(users, uid)

  function handleDelete() {
    Alert.alert(
      t('generator.deleteGenerator'),
      t('generator.deleteGeneratorConfirm', { title: generator.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            runMutation(() => deleteGenerator(userId, generatorId), {
              feedback: 'warning',
              onSuccess: () => router.dismissAll()
            })
        }
      ]
    )
  }

  async function handleAssign(targetUserId: string) {
    await runMutation(() =>
      assignUserToGenerator(userId, generatorId, targetUserId)
    )
  }

  function handleUnassign(targetUserId: string) {
    Alert.alert(t('generator.unassign'), t('generator.unassignConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () =>
          runMutation(
            () => unassignUserFromGenerator(userId, generatorId, targetUserId),
            { feedback: 'warning' }
          )
      }
    ])
  }

  const titleBinding = bind.text('title')
  const modelBinding = bind.text('model')
  const descriptionBinding = bind.text('description')
  const maxRunBinding = bind.text('maxConsecutiveRunHours')
  const restBinding = bind.text('requiredRestHours')
  const warnBinding = bind.text('runWarningThresholdPct')

  return (
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      variant="long-form"
    >
      <View className="gap-5">
        <FormField
          binding={titleBinding}
          label={t('generator.title')}
          testID="gen-settings-title-input"
          placeholder={t('generator.generatorTitle')}
        />

        <FormField
          binding={modelBinding}
          label={t('generator.model')}
          placeholder={t('generator.generatorModel')}
        />

        <FormField
          binding={descriptionBinding}
          label={t('generator.description')}
          description={t('common.optional')}
          placeholder={t('generator.descriptionPlaceholder')}
          multiline
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              binding={maxRunBinding}
              label={t('generator.maxRunHours')}
              placeholder="8"
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <FormField
              binding={restBinding}
              label={t('generator.restHours')}
              placeholder="4"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <FormField
          binding={warnBinding}
          label={t('generator.warningThresholdPct')}
          description={t('generator.warningThresholdDesc')}
          placeholder="80"
          keyboardType="number-pad"
        />
      </View>

      <AssignedMembersSection
        assignments={assignments}
        unassignedMembers={unassignedMembers}
        getUserName={resolveUserName}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
      />

      <FormError message={formError} />

      <Button
        testID="gen-settings-delete"
        variant="danger"
        size="lg"
        onPress={handleDelete}
      >
        {t('generator.deleteGenerator')}
      </Button>
    </FormScreen>
  )
}
