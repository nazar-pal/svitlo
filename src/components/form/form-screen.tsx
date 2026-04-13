import { Stack } from 'expo-router'
import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'
import type { SFSymbol } from 'sf-symbols-typescript'

import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'

interface FormScreenProps {
  onSubmit: () => void | Promise<void>
  isSubmitting: boolean
  submitDisabled?: boolean
  submitIcon?: SFSymbol
  variant?: 'default' | 'scroll' | 'long-form'
  children: ReactNode
  formError?: string
}

export function FormScreen({
  onSubmit,
  isSubmitting,
  submitDisabled,
  submitIcon,
  variant = 'default',
  children,
  formError
}: FormScreenProps) {
  const isDisabled = isSubmitting || submitDisabled
  const body = (
    <View className="mx-auto w-full max-w-150 gap-7">
      {children}
      <FormError message={formError ?? ''} />
    </View>
  )

  const contentContainerClassName =
    variant === 'long-form' ? 'px-5 pt-6 pb-6' : 'px-5 pb-10 pt-6'

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderSubmitButton
              systemImage={submitIcon}
              onPress={() => onSubmit()}
              isDisabled={isDisabled}
            />
          )
        }}
      />
      {variant === 'scroll' ? (
        <ScrollView
          className="bg-background flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName={contentContainerClassName}
        >
          {body}
        </ScrollView>
      ) : (
        <KeyboardAwareScrollView
          className="bg-background flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName={contentContainerClassName}
          keyboardShouldPersistTaps="handled"
          bottomOffset={16}
          extraKeyboardSpace={variant === 'long-form' ? 42 : undefined}
        >
          {body}
        </KeyboardAwareScrollView>
      )}
      {variant === 'long-form' ? <KeyboardToolbar /> : null}
    </>
  )
}
