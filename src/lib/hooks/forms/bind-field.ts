import type { FormState } from './use-form-state'

export interface TextBinding {
  value: string
  onChangeText: (v: string) => void
  isInvalid: boolean
  errorMessage: string | undefined
}

export interface ValueBinding<V> {
  value: V
  onChange: (v: V) => void
  isInvalid: boolean
  errorMessage: string | undefined
}

export type StringKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : never
}[keyof T & string]

export function bindText<T extends Record<string, unknown>>(
  state: FormState<T>,
  name: StringKeys<T>
): TextBinding {
  const error = state.fieldErrors[name]
  return {
    value: state.values[name] as string,
    onChangeText: v => state.set(name, v as T[typeof name]),
    isInvalid: !!error,
    errorMessage: error
  }
}

export function bindValue<
  T extends Record<string, unknown>,
  K extends keyof T & string
>(state: FormState<T>, name: K): ValueBinding<T[K]> {
  const error = state.fieldErrors[name]
  return {
    value: state.values[name],
    onChange: v => state.set(name, v),
    isInvalid: !!error,
    errorMessage: error
  }
}
