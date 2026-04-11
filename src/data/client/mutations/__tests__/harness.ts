import { closeDatabase, createTestDatabase, resetDatabase } from './test-db'

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>

// Names prefixed with `mock` are required by babel-jest's hoisting rules:
// jest.mock() factories may only close over variables whose names start with
// `mock` (case-insensitive). Do not rename these without updating the
// factories below.
let mockTestDbRef: TestDb | null = null
let mockIdCounter = 0

function mockRequireTestDb(): TestDb {
  if (!mockTestDbRef)
    throw new Error(
      'mutation harness accessed before setupMutationHarness() ran — ' +
        'ensure harness.ts is imported before any mutation module'
    )
  return mockTestDbRef
}

// harness.ts MUST be imported before any mutation module. ES module evaluation
// order runs this file's top level — including the jest.mock calls below —
// before the importing test file's next import resolves, so the mocks are
// registered in time for `../assignments`, `../organizations`, etc.

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockRequireTestDb().db
  },
  get powersync() {
    return mockRequireTestDb().powersync
  }
}))

jest.mock('@/data/client/mutations/helpers', () => ({
  ...jest.requireActual('@/data/client/mutations/helpers'),
  newId: jest.fn(() => `id-${++mockIdCounter}`)
}))

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-uuid' }))
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

export interface MutationHarness {
  readonly db: TestDb['db']
}

export function setupMutationHarness(): MutationHarness {
  beforeAll(async () => {
    mockTestDbRef = await createTestDatabase()
  })

  beforeEach(() => {
    const db = mockRequireTestDb()
    resetDatabase(db.sqlite)
    mockIdCounter = 0
  })

  afterAll(() => {
    if (mockTestDbRef) {
      closeDatabase(mockTestDbRef.sqlite)
      mockTestDbRef = null
    }
  })

  return {
    get db() {
      return mockRequireTestDb().db
    }
  }
}
