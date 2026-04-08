---
name: review-testing
description: Audit and improve the testing setup for a local-first Expo/React Native mobile app using PowerSync (client SQLite via @powersync/node + better-sqlite3), PGlite (server-side Postgres testing), Drizzle ORM, oRPC, BetterAuth, and Neon. Use this skill whenever asked to review tests, audit test coverage, improve testing, check test best practices, verify the test setup, or fix testing issues. Also trigger when the user mentions test fidelity, test databases, PGlite, mocking PowerSync, testing sync/offline behavior, removing unnecessary tests, or test cleanup.
---

# Review Testing

Audit the project's testing setup against best practices for a local-first Expo/React Native app with PowerSync and Neon. Identify the highest-impact improvements and implement them.

## Stack context

This is a mobile app built with Expo (always the latest SDK) and React Native using a local-first architecture. Key details the agent must know:

- **Test runner:** Jest with `jest-expo` preset
- **Client database (production):** PowerSync with OP-SQLite (SQLite)
- **Client database (tests):** `@powersync/node` with `better-sqlite3`, in-memory. Schema is applied via Drizzle Kit's programmatic API (`generateSQLiteDrizzleJson` + `generateSQLiteMigration`) — NOT migration files. A shared `test-db.ts` utility handles this, including manually applying unique indexes that mirror server constraints (`applyServerConstraints`).
- **Server database (production):** Neon PostgreSQL
- **Server database (tests):** PGlite, in-memory. Schema is applied the same way — `generateDrizzleJson` + `generateMigration` from `drizzle-kit/api`. A shared `test-server-db.ts` utility handles this, including manually applying triggers that Drizzle can't express (`applyTriggers`).
- **ORM:** Drizzle ORM (separate client and server schemas)
- **API layer:** oRPC
- **Auth:** BetterAuth (email/password + Apple Sign-In)
- **Sync:** PowerSync Sync Streams (NOT legacy Sync Rules)
- **Data fetching in components:** Direct PowerSync hooks (`useQuery`, `useSuspenseQuery`, `useStatus`)
- **Network mocking:** MSW (Mock Service Worker) — preferred approach
- **E2E:** Maestro (planned, may not be set up yet)

## Step 1: Discover the current setup

Before making any judgments, understand what exists:

```bash
# Find test config
find . -maxdepth 3 -name "jest.config*" -o -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" | head -40

# Check test dependencies
cat package.json | grep -E "jest|testing-library|msw|powersync|pglite|better-sqlite3|maestro" || true

# Find the shared test DB utilities
find . -maxdepth 5 -name "test-db*" -o -name "test-server-db*" | head -10

# Check for test setup files and mocks
find . -maxdepth 4 -name "setup*.ts" -o -name "setup*.js" -o -name "test-utils*" -o -name "__mocks__" | head -20

# Find the PowerSync schema and Drizzle schemas
find . -maxdepth 5 \( -path "*/client/db-schema*" -o -path "*/server/db-schema*" -o -name "AppSchema*" \) | head -10

# Find the backend connector (uploadData)
grep -rl "uploadData\|BackendConnector" --include="*.ts" --include="*.tsx" -l | head -5

# Check for MSW setup
find . -maxdepth 4 -name "handlers*" -path "*msw*" -o -name "server*" -path "*msw*" -o -name "handlers*" -path "*mock*" | head -5

# Check for Maestro flows
find . -maxdepth 3 -name "*.yaml" -path "*maestro*" -o -name "*.yaml" -path "*.maestro*" | head -10
```

Read the test config, the shared `test-db.ts` and `test-server-db.ts` utilities, a representative sample of existing tests, and any test setup files. Understand the full picture before proceeding.

## Step 2: Audit against the checklist

Evaluate every area below. For each, determine: does the project do this? Is it done correctly? What's the gap?

### 2.1 Jest configuration

**Best practice:** Use `jest-expo` preset with correct transform and module resolution settings.

Check for:
- Correct preset (`jest-expo`, or platform-specific `jest-expo/ios` / `jest-expo/android` if needed)
- `transformIgnorePatterns` allowlists React Native, Expo, and PowerSync packages for Babel transformation
- `moduleFileExtensions` includes platform extensions if needed
- TypeScript path aliases resolve correctly in tests (matching `tsconfig.json` paths)
- `setupFilesAfterFramework` or `setupFiles` correctly loads native module mocks

**Docs:**
- https://docs.expo.dev/develop/unit-testing/
- https://reactnative.dev/docs/testing-overview

### 2.2 Client-side database testing (PowerSync SQLite)

**This is the single highest-value area.** SQLite is the production database on the client — it must NOT be mocked in integration tests.

The project uses `@powersync/node` with `better-sqlite3` for in-memory test databases, with schema applied via Drizzle Kit's programmatic API. A shared `test-db.ts` utility handles setup.

Check for:
- **All tests use the shared `test-db.ts` utility** — no test file should be creating its own database setup or mocking PowerSync directly
- The utility creates a fresh in-memory database per test (no shared mutable state between tests)
- `db.init()` is called but **`db.connect()` is never called** — tests run locally without the sync service
- `db.close()` is called in `afterEach` to prevent memory leaks
- The `applyServerConstraints` step in `test-db.ts` stays in sync with the actual server-side unique indexes — **verify that every unique constraint on the Neon/Drizzle server schema has a corresponding entry in `applyServerConstraints`**. Missing constraints mean tests won't catch uniqueness violations that would occur in production.
- The DDL generation from `generateSQLiteDrizzleJson` + `generateSQLiteMigration` correctly produces the same tables and columns as the PowerSync `AppSchema` — check for any drift between the Drizzle client schema and the PowerSync schema definition

**Anti-patterns to flag:**
- Any test that mocks `db.execute()`, `useQuery()`, or the PowerSync module entirely
- Any test that uses raw `better-sqlite3` or `sql.js` without going through the PowerSync database wrapper
- Any test that calls `db.connect()` (accidentally requiring a sync service)

**Docs:**
- https://docs.powersync.com/client-sdks/advanced/unit-testing

### 2.3 Server-side database testing (PGlite)

The project uses PGlite in-memory with schema applied via Drizzle Kit's programmatic API. A shared `test-server-db.ts` utility handles setup.

Check for:
- **All server-side tests use the shared `test-server-db.ts` utility** — no test file should create its own PGlite instance
- Fresh PGlite instance per test (no shared state)
- The `applyTriggers` step stays in sync with production — **verify every trigger defined on the Neon database has a corresponding entry in `applyTriggers`**. Missing triggers mean tests won't catch behavior that depends on them (e.g., `updated_at` auto-update, cascade logic, audit logging).
- PGlite instance is properly cleaned up after each test

**Known PGlite fidelity gaps to document if the project relies on any of these:**
- Single-connection only — cannot test concurrent transactions or connection pooling
- No role-based access control (RLS policies won't behave identically)
- Cannot test Neon-specific behaviors: PgBouncer transaction-mode pooling, scale-to-zero cold starts, `@neondatabase/serverless` driver behavior

**Schema-driven vs migration-driven tradeoff:** The current approach (generating DDL from schema objects) means tests always reflect the current schema without running migration history. This is clean and fast, but it also means **tests will not catch bugs that only manifest during incremental migrations** (e.g., a migration that drops and recreates a column losing data, or an ALTER that fails on existing rows). Note this as a known gap — not necessarily something to fix, but something the team should be aware of. For critical migrations, consider a separate migration-specific test that runs the actual SQL migration files against a PGlite instance seeded with representative data.

**Docs:**
- https://pglite.dev/extensions/

### 2.4 CRUD upload queue testing

The project already has upload queue tests. Verify they are thorough.

Check for:
- Tests that write data locally and inspect the queue via `db.getUploadQueueStats()` (returns `{ count, size }`)
- Tests that verify individual CRUD operations via `db.getNextCrudTransaction()` — checking `op` type (`PUT`, `PATCH`, `DELETE`), table name, and `opData` payload
- Tests for the `uploadData` / `BackendConnector` implementation — ideally against MSW-mocked HTTP endpoints (if MSW is set up) or at minimum against manually mocked responses
- Tests that call `transaction.complete()` after processing and verify the queue drains
- Tests for upload failure scenarios — server rejects a write, network timeout, partial batch failure

**Key queue lifecycle scenarios that should be covered:**
1. Write while offline → queue accumulates correctly
2. Queue maintains FIFO ordering across multiple writes
3. Failed upload → appropriate retry / error handling
4. Successful upload → queue item removed, local state consistent
5. `getCrudBatch(limit)` correctly batches operations for the `uploadData` connector

### 2.5 Component testing with PowerSync context

**Best practice:** Test components that use PowerSync hooks by wrapping them in a `PowerSyncContext.Provider` with a real test database — NOT by mocking the hooks.

Check for:
- A `TestWrapper` or `renderWithProviders` utility that provides `PowerSyncContext.Provider` with a real in-memory test DB from `test-db.ts`
- Tests use `@testing-library/react-native` (RNTL) with:
  - `screen` object pattern for queries
  - `userEvent` API (preferred over `fireEvent`)
  - `findBy*` / `waitFor` for async assertions on data-driven components
  - `toBeOnTheScreen()` matcher
- Tests that insert data into the test DB and verify the component re-renders with that data via PowerSync's reactive queries
- Tests that verify `useStatus()` drives correct UI state (online/offline indicators, sync progress)

**Anti-patterns:**
- Mocking `useQuery` or `useSuspenseQuery` return values instead of providing real data through the database
- Snapshot testing data-driven components — prefer explicit assertions on rendered content

**For Expo Router:** `renderRouter` from `expo-router/testing-library` enables route-level integration tests with `toHavePathname()`.

**Docs:**
- https://callstack.github.io/react-native-testing-library/
- https://docs.expo.dev/router/reference/testing/

### 2.6 Network mocking with MSW

**Best practice:** Use MSW to intercept HTTP requests at the network level. This exercises the full client-side stack (oRPC client → fetch → serialization) rather than bypassing it with manual mocks.

Check for:
- MSW is installed and configured with a `setupServer()` for Node.js/Jest
- Handlers exist for oRPC API endpoints (the routes the `uploadData` connector and any other API calls hit)
- Tests use `server.use()` for per-test handler overrides (error responses, timeouts, partial failures)
- The upload queue tests use MSW handlers rather than manually mocking fetch

**If MSW is not set up yet**, this is a high-priority addition. The agent should:
1. Install `msw`
2. Create a handlers file with default success responses for the oRPC endpoints
3. Create a `server.ts` setup file with `setupServer(...handlers)`
4. Wire it into Jest setup (`beforeAll` → `server.listen()`, `afterEach` → `server.resetHandlers()`, `afterAll` → `server.close()`)
5. Migrate any existing manual fetch mocks to MSW handlers

**Docs:**
- https://mswjs.io/docs/getting-started

### 2.7 Native module mocking

**Best practice:** Mock only the native modules that don't run in the Jest/Node test environment. Don't over-mock.

The project uses the following native/bridged libraries that require mocking in Jest:

- `react-native-mmkv` → manual mock required (used for persistent storage — the project does NOT use AsyncStorage)
- `expo-secure-store` → manual mock required (used for offline auth/session persistence — this MUST be mocked)
- `expo-network` → manual mock required (used for connectivity detection — the project does NOT use `@react-native-community/netinfo`)
- `@shopify/react-native-skia` → manual mock required (Skia canvas and SKSL shaders won't run in Jest's JS environment)
- `react-native-reanimated` → requires the official mock setup: `react-native-reanimated/mock` or the `jest.setup.js` from Reanimated docs
- `react-native-gesture-handler` → requires `react-native-gesture-handler/jestSetup` in Jest setup
- `react-native-screens` → manual mock required (the project has a custom patch on this package)
- `expo-haptics` → manual mock or auto-mocked via `jest-expo` (verify it doesn't throw)
- `expo-apple-authentication` → manual mock required if any auth flow is tested that touches Apple Sign-In

The project does NOT use `expo-sqlite` — PowerSync uses `@op-engineering/op-sqlite` directly in production and `@powersync/node` with `better-sqlite3` in tests, so no SQLite mocking is needed.

Check that:
- Mocks live in `__mocks__/` directories or are configured in Jest's `setupFiles` / `setupFilesAfterFramework`
- The `react-native-reanimated` mock is loaded before any component that uses animated styles
- No mock is overriding a module that the test actually needs to exercise (e.g., mocking MMKV when the test should verify MMKV-based persistence logic)

**Docs:**
- https://docs.expo.dev/modules/mocking/
- https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/

### 2.8 Offline-first testing

**Best practice:** Offline is the primary code path in a local-first app. The test suite should verify offline behavior first, then layer on connectivity.

Check for:
- Tests that verify the app works fully offline (reads from local SQLite, writes to upload queue) without any network calls
- Tests for offline → online transition (queue drains, data reaches server via MSW-mocked endpoints)
- Tests for online → offline transition (writes continue locally, no errors thrown)
- Network state abstraction — connectivity detection should be injectable so tests can toggle online/offline programmatically
- PowerSync `useStatus()` hook drives correct UI state in offline scenarios

**Anti-pattern:** If the test suite assumes the network is always available, it's testing the wrong thing for a local-first app. The majority of integration tests should run with NO network at all — just local PowerSync SQLite.

### 2.9 Sync Streams

The project uses PowerSync Sync Streams (the current recommended approach, not legacy Sync Rules). There is currently **no dedicated programmatic testing package** for Sync Streams. The `@powersync/service-sync-rules` package was built for the legacy system.

Available verification tools:
- **Sync Diagnostics Client** — launchable from the PowerSync Dashboard, inspects buckets and subscription behavior per user
- **Dashboard "Migrate to Sync Streams" button** — useful for validating stream definitions

Do NOT write automated tests against Sync Streams internals — there's no stable API for this. Sync Streams verification relies on the Diagnostics Client and manual inspection for now. If a programmatic testing path becomes available in future PowerSync releases, revisit this section.

**Docs:**
- https://docs.powersync.com/sync/streams/overview

### 2.10 Identifying and removing unnecessary tests

**Best practice:** Tests are code. Dead or low-value tests cost maintenance time, slow down the suite, create noise in CI, and erode trust in the test suite. Actively scan for tests to delete.

**Read through every `*.test.*` and `*.spec.*` file and flag tests in these categories:**

1. **Smoke-only tests with no real assertions** — tests that render a component and only check `toBeTruthy()` or "does not crash." TypeScript and a linter already catch this. Delete unless the component has complex conditional rendering.
2. **Snapshot tests on data-driven or frequently changing components** — these break on every minor UI change, get blindly updated with `--updateSnapshot`, and stop catching regressions. Delete and replace with explicit behavioral assertions.
3. **Tests that re-test library behavior** — testing that `useQuery` returns data when data exists, or that `useState` updates state. If the test verifies React or PowerSync internals rather than application logic, delete it.
4. **Duplicate coverage** — two or more tests that exercise the exact same code path with trivially different inputs. Keep the most representative one, delete the rest.
5. **Tests mocking everything they touch** — if a test mocks the database, the network, the hooks, and the navigation, it's testing that mocks return what you told them to return. It verifies nothing about real behavior. Delete or rewrite as an integration test with real dependencies.
6. **Commented-out or skipped tests** — `xit`, `test.skip`, `describe.skip`, commented test blocks. If skipped for more than a sprint, it's dead code. Delete.
7. **Tests for deleted or unreachable features** — test files importing from modules that no longer exist or testing removed UI flows. Delete.
8. **Overly granular unit tests for trivial code** — testing a one-line utility with 8 cases, or testing simple type guards, constant exports, or re-exports. Maintenance cost exceeds value.

**For each flagged test, explain WHY it's unnecessary** so the developer understands the reasoning and doesn't recreate the pattern.

**The question to ask for every test:** "If this test were deleted, would we lose confidence in any real user-facing behavior?" If no, flag it.

### 2.11 Test distribution

**Recommended distribution for this stack:**
- ~40% unit tests (pure functions, transformations, validation, individual hooks via `renderHook`)
- ~40% integration tests (real PowerSync DB, MSW-mocked network — HIGHEST VALUE)
- ~10-20% E2E tests (Maestro for critical user journeys)
- Static analysis foundation (TypeScript strict mode + ESLint)

**Additional anti-patterns to flag:**
1. Coupling tests to PowerSync internal tables (`ps_*`) instead of testing through the app's data access layer
2. Shared mutable database state between tests — each test must get a fresh instance from the shared utilities
3. Missing `db.close()` in `afterEach`
4. Testing only happy-path online flows in a local-first app

## Step 3: Produce a prioritized improvement plan

After auditing, produce a prioritized list of improvements ordered by impact:

**Priority 1 (Critical — do these first):**
- Remove unnecessary tests identified in section 2.10
- Fix any test that mocks PowerSync or SQLite instead of using the shared `test-db.ts` utility
- Fix test isolation issues (shared DB state, missing cleanup)
- Verify `applyServerConstraints` (client) and `applyTriggers` (server) are in sync with production

**Priority 2 (High — significant quality improvement):**
- Set up MSW if not already configured (section 2.6)
- Add component integration tests with real PowerSync context (section 2.5)
- Add offline-first scenario tests (section 2.8)
- Migrate any existing manual fetch mocks to MSW handlers

**Priority 3 (Medium — good practices):**
- Improve native module mocking completeness (section 2.7)
- Strengthen upload queue tests with failure scenarios (section 2.4)
- Add a `TestWrapper` / `renderWithProviders` utility if one doesn't exist

**Priority 4 (Nice to have):**
- Set up Maestro E2E for critical user journeys
- Consider a migration-specific test for critical schema changes (section 2.3)

## Step 4: Implement improvements

After presenting the plan and getting confirmation, implement changes in priority order. For each change:

1. Explain what you're doing and why
2. Make the change
3. Run the affected tests to verify they pass
4. Move to the next item

When adding tests, follow the existing project conventions for file naming, directory structure, and import patterns. Always use the shared `test-db.ts` and `test-server-db.ts` utilities — never create standalone database setup in individual test files.