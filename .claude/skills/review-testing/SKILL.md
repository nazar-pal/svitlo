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
- **E2E:** Maestro — iOS simulator via dev build + Metro, flows under `.maestro/flows/`, subflows under `.maestro/subflows/`, config in `.maestro/config.yaml`, `bun run e2e*` scripts in `package.json`

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

# Hunt for DRY violations: raw SQL in test files that might duplicate production setup
grep -rn "CREATE INDEX\|CREATE TRIGGER\|CREATE UNIQUE\|ALTER TABLE" --include="*.ts" --include="*.tsx" | head -20

# Find shared modules for triggers/constraints/SQL
find . -maxdepth 5 -name "triggers*" -o -name "constraints*" -o -name "shared-sql*" | head -10

# Check for hardcoded table names in test files (potential DRY violation)
grep -rn "INSERT INTO\|SELECT.*FROM\|DELETE FROM\|UPDATE " --include="*.test.*" --include="*.spec.*" | head -20
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

### 2.5 Extract logic from components; test hooks and utilities, not screens

**This project uses many native dependencies** (react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, react-native-screens, react-native-mmkv, expo-haptics, expo-network, react-native-keyboard-controller, etc.). Rendering almost any screen in tests requires mocking 10+ native modules. At that point, you're testing component behavior in a fictional environment where none of the real platform behavior exists — the things that actually break in production (gesture interactions, animation glitches, keyboard avoidance) are precisely what mocked tests can't catch.

**The right strategy is: extract testable logic OUT of components, and test that logic directly.**

**What to actively look for and refactor:**

**1. Pure functions trapped inside components.**
Any data transformation, filtering, sorting, formatting, date calculation, or business logic living inside a component should be extracted into standalone utility functions. These are trivially unit-testable with zero mocking.

Example: Instead of testing a component that displays generator runtime stats, extract `calculateRuntimeStats(sessions: Session[]): RuntimeStats` and unit test that function with edge cases in milliseconds. Scan every component for inline logic that could be a pure function — if it takes data in and returns data out without touching React state or native APIs, extract it.

**2. Custom hooks that wrap PowerSync queries.**
A hook like `useGeneratorStatus(generatorId)` that calls `useQuery`, transforms the result, and returns a typed status object is an excellent test target. Test it with `renderHook` + a real PowerSync test DB + `PowerSyncContext.Provider`. This requires only one provider wrapper (no native module mocking), and it tests your actual SQL query + transformation logic without rendering any native UI.

Check for:
- Custom hooks that combine `useQuery` / `useSuspenseQuery` with data transformation logic — these should ALL have `renderHook` tests against a real test DB
- Hooks that derive computed state from query results (e.g., "is this generator overdue for maintenance?") — extract the computation into a pure function, test the function directly, and keep the hook thin
- The `PowerSyncContext.Provider` wrapper for hook tests should use a real in-memory test DB from `test-db.ts` — never mock `useQuery` return values

**3. State machines and conditional logic.**
If a screen has a complex state machine (loading → empty → data → error → offline), extract the state derivation into a function: `deriveScreenState(data, syncStatus, error): ScreenState`. Test that function with all state combinations as a unit test.

**When component tests ARE worth the mock cost (rare):**
Only for the 2-3 screens with genuinely complex conditional rendering — screens with multiple visual states, branching based on data + sync status + auth state, or components that orchestrate several hooks together. For these, accept the mock cost and use RNTL with a real PowerSync DB in context. But this should be the exception, not the default.

**When component tests are NOT worth it (the majority):**
A component that fetches data with `useQuery`, transforms it slightly, and renders a list does NOT need a component test. The query is tested by your data layer integration tests. The rendering is tested by Maestro E2E. The 10-module mock sandwich in between adds maintenance cost with minimal confidence.

**Anti-patterns to flag:**
- Component tests that mock `useQuery` or `useSuspenseQuery` return values — if you're mocking the data layer, you're testing nothing real. Either test the hook directly with a real DB, or skip the test entirely.
- Component tests that exist primarily to satisfy coverage metrics — if the test mocks everything and asserts `toBeTruthy()`, delete it.
- Business logic living inside `useEffect` or event handlers that could be extracted into pure functions.
- Hooks that do too much (fetch + transform + format + derive state) — split them so the pure parts are independently testable.

**The ideal test distribution for components in this app:**
- **Heavy:** Unit tests for extracted pure utility functions (zero mocking)
- **Heavy:** `renderHook` tests for custom PowerSync hooks (one provider wrapper, no native mocks)
- **Rare:** Full component render tests (only for 2-3 complex screens)
- **Maestro E2E** covers the real UI behavior that mocked tests can't

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
- ~45% unit tests (extracted pure utility functions, data transformations, validation — zero mocking)
- ~25% hook integration tests (`renderHook` with real PowerSync DB — one provider wrapper, no native mocks — HIGHEST VALUE)
- ~15% data layer integration tests (CRUD, upload queue, server-side via PGlite + MSW)
- ~10% E2E tests (Maestro for critical user journeys — covers all native behavior)
- ~5% or less: full component render tests (only 2-3 complex screens with significant conditional rendering)
- Static analysis foundation (TypeScript strict mode + ESLint)

**Additional anti-patterns to flag:**
1. Coupling tests to PowerSync internal tables (`ps_*`) instead of testing through the app's data access layer
2. Shared mutable database state between tests — each test must get a fresh instance from the shared utilities
3. Missing `db.close()` in `afterEach`
4. Testing only happy-path online flows in a local-first app

### 2.12 End-to-end testing (Maestro)

**Best practice:** Maestro flows should use id-based selectors (React Native `testID` → iOS `accessibilityIdentifier`) wherever possible, not visible text. Text-based selectors are a correctness hazard in any localized app.

**Key facts to verify against the current Maestro docs — do NOT rely on memory, these details have shifted with recent iOS 26 support work:**

- **Text selectors are regex by default.** `tapOn: 'Save'` is interpreted as a regex pattern. Plain English strings happen to be valid regex, but special chars (`.`, `$`, `[`) must be escaped.
- **`id` selectors map to `accessibilityIdentifier` on iOS** (which is what React Native's `testID` becomes). `text` selectors map to `accessibilityLabel`, which is often the visible string and therefore localized.
- **Maestro's official recommendation: use `id` for "icons, images, and localized apps"** — the exact stack this skill audits. Grep every `tapOn:` / `visible:` / `assertVisible:` in `.maestro/` for bare string arguments; each one is a potential i18n regression.
- **Locale override is CLI-level, not in-flow.** `launchApp` does NOT accept a `language`, `locale`, or `appLanguage` field. Setting a device locale requires `maestro start-device --platform ios --device-locale en_US` BEFORE the test run. Don't suggest forcing locale inside YAML flows — it's not supported.
- **`eraseText` without a count defaults to 50 characters**, not "clear entire field". `eraseText: 50` is identical to `eraseText` alone. Do not suggest removing the count as a "simplification" — it's a no-op.
- **Verify NativeTabs / native-tab-bar testID propagation** against the current `expo-router` version before recommending `id` selectors for tab buttons. At the time this section was written, `expo-router/unstable-native-tabs` did not propagate `testID` to the native tab bar, so tab labels had to be tapped by text. This may change — always check `node_modules/expo-router/build/native-tabs/*.d.ts` for current prop support before flagging the existing flow as wrong.

**What to look for in the codebase:**

1. **Shared UI components that render localized text without a `testID` prop** — `EmptyState`, `SectionHeader`, custom Button/Card wrappers, dialog titles. These are the blast-radius amplifiers: a single testID prop wired through solves every flow that asserts on that component's text. Prefer adding a `testID` prop that also generates a `${testID}-action`-style id for any internal CTA button (so the empty state AND its "Try again" button are both targetable from one prop).

2. **Screens with a `testID="xxx-screen"` on only one branch** — check whether the testID is present in the empty-state branch as well as the data branch. A flow that asserts `{ id: 'xxx-screen' }` after signing up a fresh user may hit the empty branch where the testID doesn't exist.

3. **Flows tapping SwiftUI menus via `point: 'X%,Y%'`** — fragile across device form factors. These typically exist because `@expo/ui` `MenuView.swift` doesn't propagate `accessibilityIdentifier` from the JS `testID` prop. The upstream fix is a one-line patch to `MenuView.swift`; worth tracking rather than accepting indefinitely.

4. **Flows dependent on the English onboarding overlay of `expo-dev-client`** — this is an external component with hardcoded English strings. Can't be fixed by adding a testID; locale pinning is the only workaround, and only at the `start-device` level.

**Validate changes against the running suite.** After any component-level testID addition or flow edit:

1. Use `mcp__maestro__check_flow_syntax` on every edited flow file
2. Run the full suite (`bun run e2e`) on a connected iOS simulator with the dev build installed and Metro running on `localhost:8081`
3. Do NOT rely on spot-checking one flow — testID changes can break unrelated flows that share a subflow

**Docs (always re-verify — Maestro's docs change, especially for iOS 26 support):**
- https://docs.maestro.dev/reference/selectors/core-selectors
- https://docs.maestro.dev/maestro-flows/flow-control-and-logic/test-in-different-locales
- https://docs.maestro.dev/reference/commands-available/tapon
- https://docs.maestro.dev/reference/commands-available/launchapp

### 2.13 DRY: Eliminating duplication between production and test database setup

**This is a critical maintenance concern.** In a local-first app with two databases (client SQLite + server Postgres), there's a constant risk of production and test database setups drifting apart. When raw SQL or configuration is duplicated between production code and test utilities, changing one without updating the other creates silent test fidelity bugs — tests pass, but they're no longer testing what production actually does.

**Actively search for and eliminate these specific duplication patterns:**

**1. Raw SQL defined in both production and test setup.**
If the same `CREATE INDEX`, `CREATE TRIGGER`, or constraint SQL appears in both a production setup file and in `test-db.ts` / `test-server-db.ts`, that's a DRY violation. When the production SQL changes, the test copy is easily forgotten.

Fix: Extract shared SQL into a single source — either a shared module that both production and test code import, or derive it programmatically from the Drizzle schema. For example, if `applyServerConstraints` in `test-db.ts` manually defines unique indexes, check whether those can be derived from the server Drizzle schema's `.unique()` constraints rather than being hand-written SQL strings.

**2. Trigger definitions duplicated between production migrations and `applyTriggers`.**
The `applyTriggers` function in `test-server-db.ts` manually applies triggers that Drizzle can't express in its schema. If these same triggers are also defined in a migration file or a separate production setup script, the definitions exist in two places.

Fix: Extract trigger SQL into a shared `triggers.ts` module that exports the raw SQL strings. Both the production migration and `applyTriggers` import from the same source. When a trigger changes, there's only one place to update.

**3. Constraint definitions duplicated between server schema and `applyServerConstraints`.**
The `applyServerConstraints` function in `test-db.ts` applies unique indexes to the client test database that mirror server-side constraints. If these are hand-written to match the server Drizzle schema, they'll drift when the server schema changes.

Fix: Where possible, derive constraint SQL programmatically by introspecting the Drizzle server schema objects. At minimum, add a comment in `applyServerConstraints` referencing the exact server schema field each constraint mirrors, so the link is explicit and searchable. Ideally, write a helper that reads `.unique()` definitions from the server schema and generates the corresponding SQLite `CREATE UNIQUE INDEX` statements.

**4. Table/column names hardcoded as string literals in tests.**
If tests use raw SQL strings like `SELECT * FROM generators WHERE ...` instead of referencing the Drizzle schema's table and column objects, renaming a table or column in the schema won't cause a type error in tests — they'll just silently break at runtime.

Fix: Use Drizzle's query builder or at minimum reference table/column names from schema objects (`schema.generators.name`, `schema.generators.columns.id`) rather than hand-writing SQL strings. Where raw SQL is unavoidable, import table name constants from the schema module.

**5. Test data factories duplicating insert logic.**
If multiple test files each construct their own test data with inline `db.execute('INSERT INTO ...')` calls using hand-written SQL and manually generated UUIDs, that's both duplication and fragility — every INSERT must match the current schema.

Fix: Create shared test data factories (one per table/entity) that use the Drizzle schema to construct valid records with sensible defaults. Tests call `createTestGenerator({ name: 'override' })` instead of writing raw INSERTs. When a required column is added to the schema, only the factory needs updating. The `@praha/drizzle-factory` package provides this pattern for Drizzle specifically if a library-based approach is preferred.

**6. PowerSync `AppSchema` and Drizzle client schema defining the same tables independently.**
The PowerSync `AppSchema` (used at runtime) and the Drizzle client schema (used for test DDL generation) both describe the same client-side tables. If they're defined independently, adding a column to one but not the other means tests won't reflect the real table structure.

Fix: Verify that the Drizzle client schema and the PowerSync `AppSchema` are derived from the same source, or at minimum that one is generated from the other. If they're maintained separately, add a test that compares the two schemas programmatically — asserting that every table and column in `AppSchema` has a corresponding definition in the Drizzle client schema.

**7. Environment configuration and connection strings duplicated across files.**
If database URLs, API base URLs, or auth configuration are hardcoded in both production config and test setup files rather than pulled from a shared config module, they'll drift.

Fix: Use a shared config/env module that both production and test code reference. Tests override specific values (e.g., using PGlite instead of Neon URL) but inherit everything else.

**The general principle:** The Drizzle schema should be the single source of truth for database structure. Everything else — test DDL generation, constraints, indexes, data factories — should derive from it rather than redefine it. When you find raw SQL in a test file, ask: "Could this be derived from the Drizzle schema instead?" If yes, refactor.

## Step 3: Produce a prioritized improvement plan

After auditing, produce a prioritized list of improvements ordered by impact:

**Priority 1 (Critical — do these first):**
- Remove unnecessary tests identified in section 2.10
- Extract business logic from components into pure utility functions and thin custom hooks (section 2.5) — this unlocks testability without native module mocking
- Fix DRY violations between production and test database setup (section 2.12) — especially duplicated trigger/constraint SQL and hardcoded table names
- Fix any test that mocks PowerSync or SQLite instead of using the shared `test-db.ts` utility
- Fix test isolation issues (shared DB state, missing cleanup)
- Verify `applyServerConstraints` (client) and `applyTriggers` (server) are in sync with production

**Priority 2 (High — significant quality improvement):**
- Add `renderHook` tests for custom PowerSync hooks with real test DB (section 2.5)
- Add unit tests for newly extracted utility functions
- Set up MSW if not already configured (section 2.6)
- Add offline-first scenario tests (section 2.8)
- Migrate any existing manual fetch mocks to MSW handlers

**Priority 3 (Medium — good practices):**
- Improve native module mocking completeness (section 2.7) — but ONLY for the few screens that warrant full component tests
- Strengthen upload queue tests with failure scenarios (section 2.4)

**Priority 4 (Nice to have):**
- Audit Maestro flows for id-based selectors and i18n-safe assertions (section 2.12) — add `testID` props to shared components (`EmptyState`, `SectionHeader`, CTA buttons) so every flow can switch off visible English text
- Consider a migration-specific test for critical schema changes (section 2.3)
- Add full component render tests for the 2-3 most complex screens (only if Maestro doesn't already cover the same scenarios)

## Step 4: Implement improvements

After presenting the plan and getting confirmation, implement changes in priority order. For each change:

1. Explain what you're doing and why
2. Make the change
3. Run the affected tests to verify they pass
4. Move to the next item

When adding tests, follow the existing project conventions for file naming, directory structure, and import patterns. Always use the shared `test-db.ts` and `test-server-db.ts` utilities — never create standalone database setup in individual test files.