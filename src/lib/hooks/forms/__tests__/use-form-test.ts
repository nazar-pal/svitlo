import { act, renderHook, waitFor } from '@testing-library/react-native'
import { z } from 'zod'

import { fail, ok } from '@/data/shared/result'
import { useForm } from '../use-form'
import { validateWithZod } from '../validate-with-zod'

jest.mock('@/lib/haptics', () => ({
  notifySuccess: jest.fn()
}))

const { notifySuccess } = jest.requireMock<{
  notifySuccess: jest.Mock
}>('@/lib/haptics')

describe('useForm', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('happy path', () => {
    it('runs build → mutate → onSuccess and clears formError', async () => {
      const mutate = jest.fn().mockResolvedValue(ok)
      const onSuccess = jest.fn()
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate,
          onSuccess
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).toHaveBeenCalledWith({ name: 'Alice' })
      expect(notifySuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(result.current.formError).toBe('')
      expect(result.current.isSubmitting).toBe(false)
    })

    it('exposes form state via the form handle', () => {
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice', age: 30 },
          build: values => ({ ok: true, data: values }),
          mutate: jest.fn().mockResolvedValue(ok)
        })
      )

      act(() => result.current.form.set('name', 'Bob'))
      expect(result.current.form.values.name).toBe('Bob')
      expect(result.current.form.isDirty).toBe(true)
    })
  })

  describe('build failures', () => {
    it('writes fieldErrors from build into form state and skips mutate', async () => {
      const mutate = jest.fn().mockResolvedValue(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { name: '' },
          build: () => ({
            ok: false,
            fieldErrors: { name: 'required' }
          }),
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).not.toHaveBeenCalled()
      expect(result.current.form.fieldErrors.name).toBe('required')
    })

    it('writes formError from build and skips mutate', async () => {
      const mutate = jest.fn().mockResolvedValue(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { startedAt: new Date(2), stoppedAt: new Date(1) },
          build: values => {
            if (values.stoppedAt <= values.startedAt)
              return { ok: false, formError: 'end before start' }
            return { ok: true, data: values }
          },
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).not.toHaveBeenCalled()
      expect(result.current.formError).toBe('end before start')
    })

    it('aborts silently when build returns null', async () => {
      const mutate = jest.fn().mockResolvedValue(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: () => null,
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).not.toHaveBeenCalled()
      expect(result.current.formError).toBe('')
      expect(result.current.form.fieldErrors).toEqual({})
    })

    it('clears formError on demand via clearFormError', async () => {
      const mutate = jest.fn().mockResolvedValue(fail('boom'))
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })
      expect(result.current.formError).toBe('boom')

      act(() => result.current.clearFormError())
      expect(result.current.formError).toBe('')
    })

    it('clears stale formError before re-running build', async () => {
      const mutate = jest
        .fn()
        .mockResolvedValueOnce(fail('first attempt failed'))
        .mockResolvedValueOnce(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })
      expect(result.current.formError).toBe('first attempt failed')

      await act(async () => {
        await result.current.submit()
      })
      expect(result.current.formError).toBe('')
    })
  })

  describe('mutation failures', () => {
    it('routes mutation errors to formError without calling onSuccess', async () => {
      const mutate = jest.fn().mockResolvedValue(fail('boom'))
      const onSuccess = jest.fn()
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate,
          onSuccess
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.formError).toBe('boom')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('clears the submitting flag even if mutate throws', async () => {
      const mutate = jest.fn().mockRejectedValue(new Error('network'))
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate
        })
      )

      await expect(
        act(async () => {
          await result.current.submit()
        })
      ).rejects.toThrow('network')
      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe('shortCircuit', () => {
    it('skips build/mutate and calls onSuccess when shortCircuit is true', async () => {
      const mutate = jest.fn().mockResolvedValue(ok)
      const onSuccess = jest.fn()
      const build = jest.fn()
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build,
          mutate,
          onSuccess,
          shortCircuit: state => !state.isDirty
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(build).not.toHaveBeenCalled()
      expect(mutate).not.toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  describe('re-entry protection', () => {
    it('ignores a second submit while the first is in flight', async () => {
      let release!: () => void
      const gate = new Promise<void>(resolve => {
        release = resolve
      })
      const mutate = jest.fn().mockImplementation(async () => {
        await gate
        return ok
      })

      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate
        })
      )

      let firstCall!: Promise<void>
      let secondCall!: Promise<void>
      act(() => {
        firstCall = result.current.submit()
        secondCall = result.current.submit()
      })

      await waitFor(() => expect(result.current.isSubmitting).toBe(true))
      expect(mutate).toHaveBeenCalledTimes(1)

      await act(async () => {
        release()
        await firstCall
        await secondCall
      })

      expect(mutate).toHaveBeenCalledTimes(1)
      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe('bind helpers', () => {
    it('bind.text wires value/onChangeText/isInvalid/errorMessage to a string field', () => {
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => ({ ok: true, data: values }),
          mutate: jest.fn().mockResolvedValue(ok)
        })
      )

      const binding = result.current.bind.text('name')
      expect(binding.value).toBe('Alice')
      expect(binding.isInvalid).toBe(false)

      act(() => binding.onChangeText('Bob'))
      expect(result.current.form.values.name).toBe('Bob')
    })

    it('bind.value wires value/onChange to non-string fields', () => {
      const initial = new Date('2026-01-01T00:00:00Z')
      const { result } = renderHook(() =>
        useForm({
          initial: { at: initial },
          build: values => ({ ok: true, data: values }),
          mutate: jest.fn().mockResolvedValue(ok)
        })
      )

      const binding = result.current.bind.value('at')
      expect(binding.value).toEqual(initial)

      const next = new Date('2026-02-01T00:00:00Z')
      act(() => binding.onChange(next))
      expect(result.current.form.values.at).toEqual(next)
    })
  })

  describe('zod composition', () => {
    it('builds with validateWithZod and propagates field errors on failure', async () => {
      const schema = z.object({
        name: z.string().min(2, { message: 'too short' })
      })
      const mutate = jest.fn().mockResolvedValue(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'A' },
          build: values => validateWithZod(schema, values),
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).not.toHaveBeenCalled()
      expect(result.current.form.fieldErrors.name).toBe('too short')
    })

    it('builds with validateWithZod and runs mutate with parsed data on success', async () => {
      const schema = z.object({
        name: z.string().min(2)
      })
      const mutate = jest.fn().mockResolvedValue(ok)
      const { result } = renderHook(() =>
        useForm({
          initial: { name: 'Alice' },
          build: values => validateWithZod(schema, values),
          mutate
        })
      )

      await act(async () => {
        await result.current.submit()
      })

      expect(mutate).toHaveBeenCalledWith({ name: 'Alice' })
    })
  })
})
