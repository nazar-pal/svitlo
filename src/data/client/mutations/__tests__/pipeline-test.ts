import { z } from 'zod'

import { fail } from '@/data/shared/result'

import { setupMutationHarness } from './harness'

import { defineMutation } from '../pipeline'

const h = setupMutationHarness()

describe('defineMutation', () => {
  it('runs apply and returns ok when neither parse nor check is declared', async () => {
    const applied = jest.fn()
    const mutation = defineMutation<[]>(h.ctx, {
      apply: async handle => {
        applied(handle.db, handle.checkOk, handle.parsed)
      }
    })
    const result = await mutation()
    expect(result).toEqual({ ok: true })
    expect(applied).toHaveBeenCalledTimes(1)
    expect(applied.mock.calls[0][0]).toBe(h.ctx.db)
  })

  it('returns failFromZod on parse failure and skips check + apply', async () => {
    const checked = jest.fn()
    const applied = jest.fn()
    const mutation = defineMutation<[string], string>(h.ctx, {
      parse: ([v]) => z.string().min(1, { error: 'ENTER_NAME' }).safeParse(v),
      check: async () => {
        checked()
        return { ok: true as const }
      },
      apply: async () => {
        applied()
      }
    })
    const result = await mutation('')
    expect(result).toEqual({ ok: false, error: { code: 'ENTER_NAME' } })
    expect(checked).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
  })

  it('returns fail(code) on check failure and skips apply', async () => {
    const applied = jest.fn()
    const mutation = defineMutation<
      [],
      undefined,
      { ok: false; code: 'ONLY_ADMIN_CAN_INVITE' }
    >(h.ctx, {
      check: async () => ({ ok: false, code: 'ONLY_ADMIN_CAN_INVITE' }),
      apply: async () => {
        applied()
      }
    })
    const result = await mutation()
    expect(result).toEqual(fail('ONLY_ADMIN_CAN_INVITE'))
    expect(applied).not.toHaveBeenCalled()
  })

  it('strips decision facts from a check failure so the wire error is only { code }', async () => {
    const mutation = defineMutation<
      [],
      undefined,
      { ok: false; code: 'ONLY_ADMIN_CAN_INVITE'; facts?: unknown }
    >(h.ctx, {
      check: async () => ({
        ok: false,
        code: 'ONLY_ADMIN_CAN_INVITE',
        facts: { row: 'x' }
      }),
      apply: async () => {}
    })
    const result = await mutation()
    expect(result).toStrictEqual(fail('ONLY_ADMIN_CAN_INVITE'))
  })

  it('forwards the success branch of check to apply as checkOk', async () => {
    const applied = jest.fn()
    const mutation = defineMutation<
      [],
      undefined,
      { ok: true; payload: string } | { ok: false; code: 'NOT_MEMBER_OF_ORG' }
    >(h.ctx, {
      check: async () => ({ ok: true, payload: 'hello' }),
      apply: async ({ checkOk }) => {
        applied(checkOk)
      }
    })
    const result = await mutation()
    expect(result).toEqual({ ok: true })
    expect(applied).toHaveBeenCalledWith({ ok: true, payload: 'hello' })
  })

  it('passes the tx handle to apply when tx: true', async () => {
    let observed: unknown
    const mutation = defineMutation<[]>(h.ctx, {
      tx: true,
      apply: async ({ db }) => {
        observed = db
      }
    })
    await mutation()
    // Under the test harness, writeTx passes the same Drizzle handle through
    // wrapped in BEGIN/COMMIT — so `db` handed to apply is `ctx.db` itself.
    expect(observed).toBe(h.ctx.db)
  })

  it('forwards a fail(...) returned by apply verbatim', async () => {
    const mutation = defineMutation<[]>(h.ctx, {
      apply: async () => fail('ORGANIZATION_NOT_FOUND')
    })
    const result = await mutation()
    expect(result).toEqual(fail('ORGANIZATION_NOT_FOUND'))
  })

  it('forwards validate failure and skips check + apply', async () => {
    const checked = jest.fn()
    const applied = jest.fn()
    const mutation = defineMutation<[string]>(h.ctx, {
      validate: ([v]) =>
        v === 'bad'
          ? fail('MAINTENANCE_TASK_VALIDATION_FAILED', { taskName: v })
          : undefined,
      check: async () => {
        checked()
        return { ok: true as const }
      },
      apply: async () => {
        applied()
      }
    })
    const result = await mutation('bad')
    expect(result).toEqual(
      fail('MAINTENANCE_TASK_VALIDATION_FAILED', { taskName: 'bad' })
    )
    expect(checked).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
  })

  it('forwards { validated } from validate to apply', async () => {
    const applied = jest.fn()
    const mutation = defineMutation(h.ctx, {
      validate: ([items]: [string[]]) => ({
        validated: items.map(s => s.trim())
      }),
      apply: async ({ validated }) => {
        applied(validated)
      }
    })
    await mutation(['  foo  ', '  bar  '])
    expect(applied).toHaveBeenCalledWith(['foo', 'bar'])
  })

  it('leaves validated as undefined when validate returns void', async () => {
    const applied = jest.fn()
    const mutation = defineMutation<[]>(h.ctx, {
      validate: () => undefined,
      apply: async ({ validated }) => {
        applied(validated)
      }
    })
    await mutation()
    expect(applied).toHaveBeenCalledWith(undefined)
  })

  it('forwards a parameterized check failure with params intact', async () => {
    const applied = jest.fn()
    const mutation = defineMutation<
      [],
      undefined,
      {
        ok: false
        code: 'MAINTENANCE_TASK_VALIDATION_FAILED'
        params: { taskName: string }
      }
    >(h.ctx, {
      check: async () => ({
        ok: false,
        code: 'MAINTENANCE_TASK_VALIDATION_FAILED',
        params: { taskName: 'oil' }
      }),
      apply: async () => {
        applied()
      }
    })
    const result = await mutation()
    expect(result).toEqual(
      fail('MAINTENANCE_TASK_VALIDATION_FAILED', { taskName: 'oil' })
    )
    expect(applied).not.toHaveBeenCalled()
  })
})
