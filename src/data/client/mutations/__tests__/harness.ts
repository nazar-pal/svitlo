import { closeDatabase, createTestDatabase, resetDatabase } from './test-db'

import { buildClientChecks, type MutationContext } from '../context'
import { createAssignmentMutations } from '../assignments'
import { createGeneratorMutations } from '../generators'
import { createInvitationMutations } from '../invitations'
import { createMaintenanceMutations } from '../maintenance'
import { createMemberMutations } from '../members'
import { createOrganizationMutations } from '../organizations'
import { createSessionMutations } from '../sessions'

// Stub out `@/lib/powersync/database` so jest never tries to load the native
// op-sqlite binary. Each test builds its own MutationContext over the
// in-memory SQLite db returned by createTestDatabase() — nothing ever touches
// the production db or randomUUID.
jest.mock('@/lib/powersync/database', () => ({ db: null }))

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>

interface BuiltMutations {
  organizations: ReturnType<typeof createOrganizationMutations>
  generators: ReturnType<typeof createGeneratorMutations>
  invitations: ReturnType<typeof createInvitationMutations>
  sessions: ReturnType<typeof createSessionMutations>
  maintenance: ReturnType<typeof createMaintenanceMutations>
  members: ReturnType<typeof createMemberMutations>
  assignments: ReturnType<typeof createAssignmentMutations>
}

export interface MutationHarness {
  readonly db: TestDb['db']
  readonly ctx: MutationContext
  readonly mutations: BuiltMutations
  setNow(date: Date): void
}

interface HarnessState {
  testDb: TestDb | null
  idCounter: number
  now: Date
  built: MutationHarness | null
}

function buildHarness(state: HarnessState, t: TestDb): MutationHarness {
  const ctx: MutationContext = {
    db: t.db,
    checks: buildClientChecks(t.db),
    newId: () => `id-${++state.idCounter}`,
    now: () => state.now,
    writeTx: t.writeTx
  }
  return {
    db: t.db,
    ctx,
    mutations: {
      organizations: createOrganizationMutations(ctx),
      generators: createGeneratorMutations(ctx),
      invitations: createInvitationMutations(ctx),
      sessions: createSessionMutations(ctx),
      maintenance: createMaintenanceMutations(ctx),
      members: createMemberMutations(ctx),
      assignments: createAssignmentMutations(ctx)
    },
    setNow: (date: Date) => {
      state.now = date
    }
  }
}

function requireBuilt(state: HarnessState): MutationHarness {
  if (!state.built) throw new Error('harness accessed before beforeAll')
  return state.built
}

// Deep Proxy so `const { createOrganization } = h.mutations.organizations` at
// file top-level doesn't touch `harness.built` before `beforeAll` runs: each
// nested access returns another Proxy, and only the final method INVOCATION
// resolves the real harness.
function makeHarnessProxy(state: HarnessState): MutationHarness {
  const mutationsProxy = new Proxy({} as BuiltMutations, {
    get(_target, domain: string) {
      return new Proxy(
        {},
        {
          get(_, method: string) {
            return (...args: unknown[]) => {
              const built = requireBuilt(state)
              const bundle = built.mutations[
                domain as keyof BuiltMutations
              ] as Record<string, (...a: unknown[]) => unknown>
              return bundle[method](...args)
            }
          }
        }
      )
    }
  })

  return new Proxy({} as MutationHarness, {
    get(_target, prop) {
      if (prop === 'mutations') return mutationsProxy
      if (prop === 'setNow')
        return (date: Date) => requireBuilt(state).setNow(date)
      return requireBuilt(state)[prop as keyof MutationHarness]
    }
  })
}

export function setupMutationHarness(): MutationHarness {
  const state: HarnessState = {
    testDb: null,
    idCounter: 0,
    now: new Date(),
    built: null
  }

  beforeAll(async () => {
    state.testDb = await createTestDatabase()
    state.built = buildHarness(state, state.testDb)
  })

  beforeEach(() => {
    if (!state.testDb) throw new Error('harness accessed before beforeAll')
    resetDatabase(state.testDb.sqlite)
    state.idCounter = 0
    state.now = new Date()
  })

  afterAll(() => {
    if (state.testDb) {
      closeDatabase(state.testDb.sqlite)
      state.testDb = null
      state.built = null
    }
  })

  return makeHarnessProxy(state)
}
