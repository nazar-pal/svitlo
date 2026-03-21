import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { Alert, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
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
import {
  flattenZodErrors,
  updateGeneratorSchema
} from '@/data/client/validation'
import { notifySuccess, notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useFormFields } from '@/lib/hooks/use-form-fields'
import { useLocalUser } from '@/lib/powersync'
import { getUserName } from '@/lib/utils/get-user-name'
import { useState } from 'react'

import { AssignedEmployeesSection } from '@/components/assigned-employees-section'

export default function GeneratorSettingsScreen() {
  const { generatorId } = useLocalSearchParams<{ generatorId: string }>()
  const { data: gens } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = gens[0]
  if (!generator) return null

  return <SettingsForm generator={generator} />
}

function SettingsForm({ generator }: { generator: Generator }) {
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

  const [error, setError] = useState('')

  const { values, field, fieldErrors, setFieldErrors } = useFormFields({
    title: generator.title,
    model: generator.model,
    description: generator.description ?? '',
    maxConsecutiveRunHours: String(generator.maxConsecutiveRunHours),
    requiredRestHours: String(generator.requiredRestHours),
    runWarningThresholdPct: String(generator.runWarningThresholdPct)
  })

  const assignedUserIds = new Set(assignments.map(a => a.userId))
  const unassignedMembers = orgMembers.filter(
    m => !assignedUserIds.has(m.userId)
  )

  const resolveUserName = (uid: string) => getUserName(users, uid)

  async function handleSave() {
    const unchanged =
      values.title === generator.title &&
      values.model === generator.model &&
      values.description === (generator.description ?? '') &&
      values.maxConsecutiveRunHours ===
        String(generator.maxConsecutiveRunHours) &&
      values.requiredRestHours === String(generator.requiredRestHours) &&
      values.runWarningThresholdPct === String(generator.runWarningThresholdPct)

    if (unchanged) {
      router.back()
      return
    }

    setError('')
    setFieldErrors({})

    const input = {
      title: values.title,
      model: values.model,
      description: values.description || null,
      maxConsecutiveRunHours: Number(values.maxConsecutiveRunHours),
      requiredRestHours: Number(values.requiredRestHours),
      runWarningThresholdPct: Number(values.runWarningThresholdPct)
    }

    const parsed = updateGeneratorSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(flattenZodErrors(parsed.error))
      return
    }

    const result = await updateGenerator(userId, generatorId, parsed.data)
    if (!result.ok) {
      setError(result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  function handleDelete() {
    Alert.alert(
      'Delete Generator',
      `Are you sure you want to delete "${generator.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteGenerator(userId, generatorId)
            if (!result.ok) return Alert.alert('Error', result.error)
            notifyWarning()
            router.dismissAll()
          }
        }
      ]
    )
  }

  async function handleAssign(targetUserId: string) {
    const result = await assignUserToGenerator(
      userId,
      generatorId,
      targetUserId
    )
    if (!result.ok) return Alert.alert('Error', result.error)
    notifySuccess()
  }

  function handleUnassign(targetUserId: string) {
    Alert.alert('Unassign', 'Remove this user from this generator?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await unassignUserFromGenerator(
            userId,
            generatorId,
            targetUserId
          )
          if (!result.ok) return Alert.alert('Error', result.error)
          notifyWarning()
        }
      }
    ])
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerRight: () => <HeaderSubmitButton onPress={handleSave} />
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
          <View className="gap-5">
            <TextField isInvalid={!!fieldErrors.title}>
              <Label>Title</Label>
              <Input placeholder="Generator title" {...field('title')} />
              <FieldError>{fieldErrors.title}</FieldError>
            </TextField>

            <TextField isInvalid={!!fieldErrors.model}>
              <Label>Model</Label>
              <Input placeholder="Generator model" {...field('model')} />
              <FieldError>{fieldErrors.model}</FieldError>
            </TextField>

            <TextField>
              <Label>Description</Label>
              <Input
                placeholder="Location, serial number, notes..."
                {...field('description')}
                multiline
              />
              <Description>Optional</Description>
            </TextField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField isInvalid={!!fieldErrors.maxConsecutiveRunHours}>
                  <Label>Max Run Hours</Label>
                  <Input
                    placeholder="8"
                    {...field('maxConsecutiveRunHours')}
                    keyboardType="decimal-pad"
                  />
                  <FieldError>{fieldErrors.maxConsecutiveRunHours}</FieldError>
                </TextField>
              </View>
              <View className="flex-1">
                <TextField isInvalid={!!fieldErrors.requiredRestHours}>
                  <Label>Rest Hours</Label>
                  <Input
                    placeholder="4"
                    {...field('requiredRestHours')}
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
                {...field('runWarningThresholdPct')}
                keyboardType="number-pad"
              />
              <Description>
                Warning appears at this percentage of max run hours
              </Description>
              <FieldError>{fieldErrors.runWarningThresholdPct}</FieldError>
            </TextField>
          </View>

          <AssignedEmployeesSection
            assignments={assignments}
            unassignedMembers={unassignedMembers}
            getUserName={resolveUserName}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
          />

          <FormError message={error} />

          <Button variant="danger" size="lg" onPress={handleDelete}>
            Delete Generator
          </Button>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
