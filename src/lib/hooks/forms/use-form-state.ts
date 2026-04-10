import { useRef, useState } from 'react'

export type FieldErrors = Partial<Record<string, string>>

export interface FormState<T extends Record<string, unknown>> {
  values: T
  isDirty: boolean
  set: <K extends keyof T & string>(name: K, value: T[K]) => void
  patch: (partial: Partial<T>) => void
  reset: (next?: T) => void
  fieldErrors: FieldErrors
  setFieldErrors: (errors: FieldErrors) => void
  clearFieldError: (name: keyof T & string) => void
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const av = a[key]
    const bv = b[key]
    if (av instanceof Date && bv instanceof Date) {
      if (av.getTime() !== bv.getTime()) return false
      continue
    }
    if (!Object.is(av, bv)) return false
  }
  return true
}

export function useFormState<T extends Record<string, unknown>>(
  initial: T
): FormState<T> {
  const [values, setValues] = useState<T>(initial)
  const [fieldErrors, setFieldErrorsState] = useState<FieldErrors>({})
  const pristineRef = useRef<T>(initial)
  const lastInitialRef = useRef<T>(initial)

  // Re-seed when the caller passes a structurally different `initial` (entity
  // loaded async). Compared against the previously seen initial — not against
  // pristine — so a manual reset(next) is not clobbered when the parent re-
  // renders with the same initial. Compared structurally so callers may pass
  // fresh literals each render without triggering an infinite re-seed loop.
  // This is the React-recommended pattern for derived state — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  if (!shallowEqual(initial, lastInitialRef.current)) {
    lastInitialRef.current = initial
    pristineRef.current = initial
    setValues(initial)
    setFieldErrorsState({})
  }

  function set<K extends keyof T & string>(name: K, value: T[K]) {
    setValues(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name])
      setFieldErrorsState(prev => {
        const { [name]: _, ...rest } = prev
        return rest as FieldErrors
      })
  }

  function patch(partial: Partial<T>) {
    setValues(prev => ({ ...prev, ...partial }))
  }

  function reset(next?: T) {
    const target = next ?? pristineRef.current
    pristineRef.current = target
    setValues(target)
    setFieldErrorsState({})
  }

  function setFieldErrors(errors: FieldErrors) {
    setFieldErrorsState(errors)
  }

  function clearFieldError(name: keyof T & string) {
    setFieldErrorsState(prev => {
      if (!prev[name]) return prev
      const { [name]: _, ...rest } = prev
      return rest as FieldErrors
    })
  }

  const isDirty = !shallowEqual(values, pristineRef.current)

  return {
    values,
    isDirty,
    set,
    patch,
    reset,
    fieldErrors,
    setFieldErrors,
    clearFieldError
  }
}
