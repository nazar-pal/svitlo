import { Description, FieldError, Input, Label, TextField } from 'heroui-native'
import type { ComponentProps, ReactNode } from 'react'

import type { TextBinding, ValueBinding } from '@/lib/hooks/forms/bind-field'

interface FormFieldProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChangeText'
> {
  binding: TextBinding
  label: string
  description?: string
}

export function FormField({
  binding,
  label,
  description,
  ...inputProps
}: FormFieldProps) {
  return (
    <TextField isInvalid={binding.isInvalid}>
      <Label>{label}</Label>
      <Input
        {...inputProps}
        value={binding.value}
        onChangeText={binding.onChangeText}
      />
      {description ? <Description>{description}</Description> : null}
      <FieldError>{binding.errorMessage}</FieldError>
    </TextField>
  )
}

interface ValueFormFieldProps<V> {
  binding: ValueBinding<V>
  label: string
  description?: string
  children: (binding: ValueBinding<V>) => ReactNode
}

export function ValueFormField<V>({
  binding,
  label,
  description,
  children
}: ValueFormFieldProps<V>) {
  return (
    <TextField isInvalid={binding.isInvalid}>
      <Label>{label}</Label>
      {children(binding)}
      {description ? <Description>{description}</Description> : null}
      <FieldError>{binding.errorMessage}</FieldError>
    </TextField>
  )
}
