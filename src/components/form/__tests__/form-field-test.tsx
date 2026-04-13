import { render } from '@testing-library/react-native'
import React from 'react'

jest.mock('heroui-native', () => {
  const { Text, TextInput, View } = jest.requireActual('react-native')
  function TextField({
    isInvalid,
    children
  }: {
    isInvalid?: boolean
    children: React.ReactNode
  }) {
    return (
      <View testID={isInvalid ? 'field-invalid' : 'field-valid'}>
        {children}
      </View>
    )
  }
  function Label({ children }: { children: React.ReactNode }) {
    return <Text testID="label">{children}</Text>
  }
  function Input(props: Record<string, unknown>) {
    return <TextInput {...props} />
  }
  function FieldError({ children }: { children?: React.ReactNode }) {
    return <Text testID="field-error">{children}</Text>
  }
  function Description({ children }: { children: React.ReactNode }) {
    return <Text testID="description">{children}</Text>
  }
  return { TextField, Label, Input, FieldError, Description }
})

import type { TextBinding, ValueBinding } from '@/lib/hooks/forms/bind-field'

import { FormField, ValueFormField } from '../form-field'

function makeTextBinding(over: Partial<TextBinding> = {}): TextBinding {
  return {
    value: '',
    onChangeText: () => {},
    isInvalid: false,
    errorMessage: undefined,
    ...over
  }
}

function makeValueBinding<V>(
  value: V,
  over: Partial<ValueBinding<V>> = {}
): ValueBinding<V> {
  return {
    value,
    onChange: () => {},
    isInvalid: false,
    errorMessage: undefined,
    ...over
  }
}

describe('FormField', () => {
  it('renders label, input value, and empty error', () => {
    const binding = makeTextBinding({ value: 'hello' })
    const { getByTestId, getByDisplayValue } = render(
      <FormField binding={binding} label="Name" />
    )
    expect(getByTestId('label').props.children).toBe('Name')
    expect(getByDisplayValue('hello')).toBeTruthy()
    expect(getByTestId('field-error').props.children).toBeUndefined()
  })

  it('propagates isInvalid and errorMessage', () => {
    const binding = makeTextBinding({
      isInvalid: true,
      errorMessage: 'Required'
    })
    const { getByTestId } = render(<FormField binding={binding} label="Name" />)
    expect(getByTestId('field-invalid')).toBeTruthy()
    expect(getByTestId('field-error').props.children).toBe('Required')
  })

  it('renders description only when provided', () => {
    const binding = makeTextBinding()
    const { queryByTestId, rerender } = render(
      <FormField binding={binding} label="Name" />
    )
    expect(queryByTestId('description')).toBeNull()
    rerender(<FormField binding={binding} label="Name" description="Hint" />)
    expect(queryByTestId('description')?.props.children).toBe('Hint')
  })

  it('forwards rest props to Input', () => {
    const binding = makeTextBinding()
    const { getByTestId } = render(
      <FormField
        binding={binding}
        label="Email"
        testID="email-input"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
    )
    const input = getByTestId('email-input')
    expect(input.props.keyboardType).toBe('email-address')
    expect(input.props.placeholder).toBe('you@example.com')
  })
})

describe('ValueFormField', () => {
  it('renders label and invokes children with binding', () => {
    const binding = makeValueBinding(new Date('2024-01-01'))
    const { getByTestId } = render(
      <ValueFormField binding={binding} label="Start">
        {b => <>{b.value.toISOString()}</>}
      </ValueFormField>
    )
    expect(getByTestId('label').props.children).toBe('Start')
  })

  it('renders errorMessage when invalid', () => {
    const binding = makeValueBinding(0, {
      isInvalid: true,
      errorMessage: 'Bad'
    })
    const { getByTestId } = render(
      <ValueFormField binding={binding} label="X">
        {() => null}
      </ValueFormField>
    )
    expect(getByTestId('field-error').props.children).toBe('Bad')
  })
})
