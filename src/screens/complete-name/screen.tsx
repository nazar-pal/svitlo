import { Button } from 'heroui-native'
import { Text, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form/form-field'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { completeNameSchema } from '@/data/shared/validation'
import { fail, ok } from '@/data/shared/result'
import { authClient } from '@/lib/auth/auth-client'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useTranslation } from '@/lib/i18n'

export default function CompleteNameScreen() {
  const { t } = useTranslation()

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: { name: '' },
    build: values => validateWithZod(completeNameSchema, values),
    mutate: async input => {
      const result = await authClient.updateUser({ name: input.name })
      if (result.error)
        return fail('AUTH_FAILED', {
          message: result.error.message ?? t('auth.somethingWentWrong')
        })
      return ok
    }
  })

  const nameBinding = bind.text('name')

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
          <FormField
            binding={nameBinding}
            label={t('auth.name')}
            testID="complete-name-input"
            placeholder={t('auth.namePlaceholder')}
            autoCapitalize="words"
            autoFocus
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <FormError message={formError} />

          <Button
            testID="complete-name-submit-button"
            variant="primary"
            isDisabled={isSubmitting}
            onPress={submit}
          >
            {t('common.continue')}
          </Button>
        </View>
      </View>
    </KeyboardAwareScrollView>
  )
}
