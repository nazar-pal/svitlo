/**
 * Mock helpers for Drizzle query chain pattern used in mutations.
 *
 * Usage:
 *   jest.mock('@/lib/powersync/database', () => mockDatabase())
 *   const { db } = require('@/lib/powersync/database')
 *   // In each test:
 *   mockSelectChain(db, [{ id: 'gen-1', ... }])
 */

export function mockDatabase() {
  return {
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    powersync: {
      writeTransaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          execute: jest.fn(),
          getOptional: jest.fn()
        }
        await fn(tx)
      })
    }
  }
}

/** Configure db.select() to return `result` through the full chain. */
export function mockSelectChain(db: { select: jest.Mock }, result: unknown[]) {
  const chain = {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(result)
      }),
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(result)
      })
    })
  }
  db.select.mockReturnValue(chain)
  return chain
}

/**
 * Configure db.select() to return different results for sequential calls.
 * Each call to db.select() consumes the next result in the list.
 */
export function mockSelectChainSequence(
  db: { select: jest.Mock },
  results: unknown[][]
) {
  for (const result of results) {
    const chain = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(result)
        }),
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(result)
        })
      })
    }
    db.select.mockReturnValueOnce(chain)
  }
}

/** Configure db.insert() to succeed. */
export function mockInsertChain(db: { insert: jest.Mock }) {
  db.insert.mockReturnValue({
    values: jest.fn().mockResolvedValue(undefined)
  })
}

/** Configure db.update() to succeed. */
export function mockUpdateChain(db: { update: jest.Mock }) {
  db.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined)
    })
  })
}

/** Configure db.delete() to succeed. */
export function mockDeleteChain(db: { delete: jest.Mock }) {
  db.delete.mockReturnValue({
    where: jest.fn().mockResolvedValue(undefined)
  })
}
