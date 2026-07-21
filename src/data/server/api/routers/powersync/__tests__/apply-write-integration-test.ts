import { NeonDbError } from '@neondatabase/serverless'

import { tableHandlers } from '../handlers'
import { powersyncRouter } from '../index'

// `applyWrite`'s only non-trivial behaviour is the catch block that classifies
// a thrown error into a structured `{ ok: false, rejection }` vs a generic
// `{ ok: false, error }`. That logic lives inside the oRPC handler. @orpc is
// ESM-only and can't be `require()`d in Jest's CJS runtime (see
// `lib/powersync/__tests__/connector-test.ts`), so the oRPC builder is shimmed:
// `protectedProcedure.input().handler(fn)` returns `fn`, exposing the real
// handler from `index.ts` for direct invocation. `@/env` and `jose` (only used
// by the unrelated `token` procedure) are stubbed so the module loads.
jest.mock('@/env', () => ({
  env: {
    POWERSYNC_PRIVATE_KEY: 'test-powersync-private-key-at-least-32-chars',
    POWERSYNC_URL: 'https://powersync.example.test'
  }
}))
jest.mock('jose', () => ({ SignJWT: class {} }))
jest.mock('../../../orpc', () => {
  const procedure = {
    input: () => procedure,
    handler: (fn: unknown) => fn
  }
  return { protectedProcedure: procedure, publicProcedure: procedure }
})

// The categorization seam cares only about the *shape* of the thrown error,
// not which table produced it. A controllable handler registry lets each test
// drive the catch block with a precise error.
jest.mock('../handlers', () => ({ tableHandlers: {} }))

interface ApplyWriteRejection {
  code: string
  message: string
  constraint?: string
  table: string
}

type ApplyWriteResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; rejection: ApplyWriteRejection }

interface ApplyWriteArgs {
  context: { db: unknown; session: { user: { id: string; email: string } } }
  input: {
    table: string
    op: 'insert' | 'update' | 'delete'
    id: string
    data?: Record<string, unknown>
  }
}

// The shimmed builder returns the raw handler; cast to its call signature.
const applyWriteHandler = powersyncRouter.applyWrite as unknown as (
  args: ApplyWriteArgs
) => Promise<ApplyWriteResult>

function applyWrite(table: string): Promise<ApplyWriteResult> {
  return applyWriteHandler({
    context: {
      db: {},
      session: { user: { id: 'user-1', email: 'admin@test.com' } }
    },
    input: { table, op: 'insert', id: 'row-1', data: {} }
  })
}

function neonError(
  message: string,
  code: string | undefined,
  constraint?: string
): NeonDbError {
  const error = new NeonDbError(message)
  error.code = code
  error.constraint = constraint
  return error
}

describe('powersyncRouter.applyWrite — rejection categorization', () => {
  beforeEach(() => {
    for (const key of Object.keys(tableHandlers))
      delete (tableHandlers as Partial<Record<string, unknown>>)[key]
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── constraint violations → structured rejection (the deepest leverage) ────

  it('routes a 23xxx integrity-constraint violation to a rejection', async () => {
    tableHandlers.maintenance_templates = async () => {
      throw neonError(
        'new row violates check constraint',
        '23514',
        'trigger_fields_match_type'
      )
    }

    const result = await applyWrite('maintenance_templates')

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: '23514',
        message: 'new row violates check constraint',
        constraint: 'trigger_fields_match_type',
        table: 'maintenance_templates'
      }
    })
  })

  it('routes a 22xxx data-exception to a rejection', async () => {
    tableHandlers.organizations = async () => {
      throw neonError('value too long for type', '22001')
    }

    const result = await applyWrite('organizations')

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: '22001',
        message: 'value too long for type',
        table: 'organizations'
      }
    })
  })

  it('routes a P0001 trigger raise_exception to a rejection', async () => {
    tableHandlers.organizations = async () => {
      throw neonError('admin_user_id cannot be changed', 'P0001')
    }

    const result = await applyWrite('organizations')

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: 'P0001',
        message: 'admin_user_id cannot be changed',
        table: 'organizations'
      }
    })
  })

  // ── everything else → generic error, NOT a rejection ───────────────────────

  it('routes a non-constraint NeonDbError (08xxx) to the generic error branch', async () => {
    tableHandlers.organizations = async () => {
      throw neonError('connection failure', '08006')
    }

    const result = await applyWrite('organizations')

    expect(result).toEqual({ ok: false, error: 'connection failure' })
    expect(result).not.toHaveProperty('rejection')
  })

  it('treats a NeonDbError without a code as a generic error', async () => {
    tableHandlers.organizations = async () => {
      throw neonError('no code present', undefined)
    }

    const result = await applyWrite('organizations')

    expect(result).toEqual({ ok: false, error: 'no code present' })
    expect(result).not.toHaveProperty('rejection')
  })

  it('treats a non-NeonDbError throw as a generic error', async () => {
    tableHandlers.organizations = async () => {
      throw new Error('unexpected bug')
    }

    const result = await applyWrite('organizations')

    expect(result).toEqual({ ok: false, error: 'unexpected bug' })
    expect(result).not.toHaveProperty('rejection')
  })

  // ── non-throwing paths pass through unchanged ──────────────────────────────

  it('passes through a handler success', async () => {
    tableHandlers.organizations = async () => ({ ok: true })

    const result = await applyWrite('organizations')

    expect(result).toEqual({ ok: true })
  })

  it('passes through a handler authorization failure unchanged', async () => {
    tableHandlers.organizations = async () => ({
      ok: false,
      error: 'Not authorized'
    })

    const result = await applyWrite('organizations')

    expect(result).toEqual({ ok: false, error: 'Not authorized' })
  })

  it('returns an error for an unhandled table without reaching the catch', async () => {
    const result = await applyWrite('not_a_real_table')

    expect(result).toEqual({
      ok: false,
      error: 'Unhandled table: not_a_real_table'
    })
  })
})
