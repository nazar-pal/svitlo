import { useState } from 'react'

interface FieldBinding {
  value: string
  onChangeText: (v: string) => void
}

interface FormFieldsReturn<T extends Record<string, string>> {
  values: T
  field: (name: keyof T & string) => FieldBinding
  set: <K extends keyof T & string>(name: K, value: T[K]) => void
  fieldErrors: Record<string, string>
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export function useFormFields<T extends Record<string, string>>(
  initial: T
): FormFieldsReturn<T> {
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function field(name: keyof T & string): FieldBinding {
    return {
      value: values[name],
      onChangeText(v: string) {
        setValues(prev => ({ ...prev, [name]: v }))
        if (fieldErrors[name]) setFieldErrors(({ [name]: _, ...rest }) => rest)
      }
    }
  }

  function set<K extends keyof T & string>(name: K, value: T[K]) {
    setValues(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(({ [name]: _, ...rest }) => rest)
  }

  return { values, field, set, fieldErrors, setFieldErrors }
}
