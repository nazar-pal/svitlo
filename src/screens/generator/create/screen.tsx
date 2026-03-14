import { useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { createGenerator } from '@/data/client/mutations'
import {
  GENERATOR_TYPES,
  insertGeneratorSchema
} from '@/data/client/validation'
import { useSelectedOrg } from '@/lib/hooks/use-selected-org'
import { useLocalUser } from '@/lib/powersync'

export default function CreateGeneratorScreen() {
  const router = useRouter()
  const localUser = useLocalUser()
  const { selectedOrgId } = useSelectedOrg()

  const [title, setTitle] = useState('')
  const [model, setModel] = useState('')
  const [generatorType, setGeneratorType] = useState<string>(GENERATOR_TYPES[0])
  const [description, setDescription] = useState('')
  const [maxRunHours, setMaxRunHours] = useState('8')
  const [restHours, setRestHours] = useState('4')
  const [warningPct, setWarningPct] = useState('80')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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

    const result = await createGenerator(localUser.id, parsed.data)
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.back()
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-6"
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

          <View className="gap-2">
            <Text className="text-foreground text-sm font-medium">Type</Text>
            <View className="bg-surface-secondary flex-row flex-wrap rounded-xl p-1">
              {GENERATOR_TYPES.map(type => (
                <Pressable
                  key={type}
                  onPress={() => setGeneratorType(type)}
                  className={`items-center rounded-lg px-3 py-2 ${
                    generatorType === type ? 'bg-background' : ''
                  }`}
                >
                  <Text
                    className={`text-[13px] font-medium capitalize ${
                      generatorType === type ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {fieldErrors.generatorType ? (
              <Text className="text-danger text-xs">
                {fieldErrors.generatorType}
              </Text>
            ) : null}
          </View>

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

        {error ? (
          <Text className="bg-danger/10 text-danger rounded-2xl px-4 py-3 text-sm">
            {error}
          </Text>
        ) : null}

        <Button variant="primary" onPress={handleCreate}>
          Create Generator
        </Button>
      </View>
    </ScrollView>
  )
}
