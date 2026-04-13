import { pgTable, text } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import { defineTableHandler } from '../pipeline'
import type { WriteContext } from '../types'

const widgets = pgTable('widgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull()
})

function makeCtx(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    db: {} as WriteContext['db'],
    userId: 'user-1',
    userEmail: 'user@test.com',
    op: 'insert',
    id: 'row-1',
    data: {},
    now: () => new Date('2026-01-01T00:00:00Z'),
    checks: {} as WriteContext['checks'],
    ...overrides
  }
}

describe('defineTableHandler', () => {
  it('formats schema parse failures as Invalid {op} {table}: {zod message}', async () => {
    const handler = defineTableHandler({
      table: widgets,
      insert: {
        schema: z.object({ name: z.string().min(1, { error: 'REQUIRED' }) }),
        apply: async () => {}
      }
    })
    const result = await handler(makeCtx({ data: { name: '' } }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.startsWith('Invalid insert widgets: ')).toBe(true)
      expect(result.error).toContain('REQUIRED')
    }
  })

  it('returns fail(code) when check fails without a shield', async () => {
    const applied = jest.fn()
    const handler = defineTableHandler({
      table: widgets,
      update: {
        check: async () => ({ ok: false, code: 'FORBIDDEN' }),
        apply: async () => {
          applied()
        }
      }
    })
    const result = await handler(makeCtx({ op: 'update' }))
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' })
    expect(applied).not.toHaveBeenCalled()
  })

  it('shield.notFound consumes matching code as silent ok', async () => {
    const applied = jest.fn()
    const handler = defineTableHandler({
      table: widgets,
      delete: {
        check: async () => ({ ok: false, code: 'WIDGET_NOT_FOUND' }),
        shield: { kind: 'notFound', code: 'WIDGET_NOT_FOUND' },
        apply: async () => {
          applied()
        }
      }
    })
    const result = await handler(makeCtx({ op: 'delete' }))
    expect(result).toEqual({ ok: true })
    expect(applied).not.toHaveBeenCalled()
  })

  it('shield.alreadyExists consumes matching code as silent ok', async () => {
    const applied = jest.fn()
    const handler = defineTableHandler({
      table: widgets,
      insert: {
        check: async () => ({ ok: false, code: 'WIDGET_EXISTS' }),
        shield: { kind: 'alreadyExists', code: 'WIDGET_EXISTS' },
        apply: async () => {
          applied()
        }
      }
    })
    const result = await handler(makeCtx())
    expect(result).toEqual({ ok: true })
    expect(applied).not.toHaveBeenCalled()
  })

  it('passes the unwrapped check success to apply and defaults to ok', async () => {
    const applied = jest.fn()
    const handler = defineTableHandler({
      table: widgets,
      update: {
        schema: z.object({ name: z.string() }),
        check: async () => ({ ok: true as const, meta: 'from-check' }),
        apply: async (_ctx, parsed, checkOk) => {
          applied(parsed, checkOk)
        }
      }
    })
    const result = await handler(makeCtx({ op: 'update', data: { name: 'x' } }))
    expect(result).toEqual({ ok: true })
    expect(applied).toHaveBeenCalledWith(
      { name: 'x' },
      { ok: true, meta: 'from-check' }
    )
  })

  it('propagates errors thrown by apply', async () => {
    const handler = defineTableHandler({
      table: widgets,
      insert: {
        apply: async () => {
          throw new Error('boom')
        }
      }
    })
    await expect(handler(makeCtx())).rejects.toThrow('boom')
  })

  it('rejects ops the table does not declare', async () => {
    const handler = defineTableHandler({
      table: widgets,
      insert: { apply: async () => {} }
    })
    const result = await handler(makeCtx({ op: 'delete' }))
    expect(result).toEqual({ ok: false, error: 'Invalid operation on widgets' })
  })
})
