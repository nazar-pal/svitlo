import { Button, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { completeNameSchema } from '@/data/client/validation'
import { authClient } from '@/lib/auth/auth-client'
import { useTranslation } from '@/lib/i18n'

export default function CompleteNameScreen() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')

    const parsed = completeNameSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setIsSubmitting(false)
      return
    }

    const result = await authClient.updateUser({ name: parsed.data.name })

    if (result.error) {
      setError(result.error.message ?? t('auth.somethingWentWrong'))
      setIsSubmitting(false)
      return
    }
  }

  return (
    <KeyboardAwareScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="min-h-full px-6 py-10"
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      <View className="mx-auto w-full max-w-110 flex-1 justify-center gap-8">
        <View className="gap-3">
          <Text className="text-foreground text-3xl font-bold">
            {t('auth.completeName')}
          </Text>
          <Text className="text-muted text-base leading-6">
            {t('auth.completeNameDesc')}
          </Text>
        </View>

        <View className="gap-4">
          <TextField>
            <Label>{t('auth.name')}</Label>
            <Input
              placeholder={t('auth.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              textContentType="name"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </TextField>

          <FormError message={error} />

          <Button
            variant="primary"
            isDisabled={isSubmitting}
            onPress={handleSubmit}
          >
            {t('common.continue')}
          </Button>
        </View>
      </View>
    </KeyboardAwareScrollView>
  )
}
