import { useRef, useState } from 'react'

import type { MutationResult } from '@/data/shared/result'
import { notifySuccess } from '@/lib/haptics'

import {
  bindText,
  bindValue,
  type StringKeys,
  type TextBinding,
  type ValueBinding
} from './bind-field'
import { useFormState, type FormState } from './use-form-state'

export type BuildResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string }

interface UseFormOptions<TValues extends Record<string, unknown>, TInput> {
  /** Seed values. May be re-seeded when its identity changes (entity loaded async). */
  initial: TValues
  /**
   * Transform & validate `form.values` into the mutation input.
   * Return `{ ok: true, data }` to proceed, `{ ok: false, fieldErrors?, formError? }`
   * to surface errors without mutating, or `null` to abort silently.
   */
  build: (values: TValues) => BuildResult<TInput> | null
  mutate: (input: TInput) => Promise<MutationResult>
  /** Called after a successful mutation, or when shortCircuit returns true. */
  onSuccess?: () => void
  /**
   * Called before build/mutate. Return true to skip them and call onSuccess
   * directly (e.g., when the form isn't dirty).
   */
  shortCircuit?: (state: FormState<TValues>) => boolean
}

interface FormBindings<T extends Record<string, unknown>> {
  text: (name: StringKeys<T>) => TextBinding
  value: <K extends keyof T & string>(name: K) => ValueBinding<T[K]>
}

interface UseFormReturn<TValues extends Record<string, unknown>> {
  form: FormState<TValues>
  submit: () => Promise<void>
  formError: string
  isSubmitting: boolean
  bind: FormBindings<TValues>
}

export function useForm<TValues extends Record<string, unknown>, TInput>(
  options: UseFormOptions<TValues, TInput>
): UseFormReturn<TValues> {
  const form = useFormState(options.initial)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlightRef = useRef(false)

  async function submit() {
    if (inFlightRef.current) return
    if (options.shortCircuit?.(form)) {
      options.onSuccess?.()
      return
    }

    // Clear stale form-level error before build() so a re-submit doesn't leave
    // an old mutation message visible while we re-validate.
    setFormError('')
    const result = options.build(form.values)
    if (result === null) return
    if (!result.ok) {
      if (result.fieldErrors) form.setFieldErrors(result.fieldErrors)
      if (result.formError !== undefined) setFormError(result.formError)
      return
    }

    inFlightRef.current = true
    setIsSubmitting(true)

    try {
      const mutationResult = await options.mutate(result.data)
      if (!mutationResult.ok) {
        setFormError(mutationResult.error)
        return
      }
      notifySuccess()
      options.onSuccess?.()
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  const bind: FormBindings<TValues> = {
    text: name => bindText(form, name),
    value: name => bindValue(form, name)
  }

  return { form, submit, formError, isSubmitting, bind }
}
