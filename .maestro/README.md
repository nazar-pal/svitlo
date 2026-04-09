# Maestro E2E Tests

End-to-end tests for the iOS development build, run with [Maestro](https://maestro.dev).

## Layout

```
.maestro/
├── config.yaml         # workspace config (appId, env, flow glob)
├── flows/              # one file per user-facing scenario
│   ├── auth/
│   ├── generators/
│   ├── maintenance/
│   ├── navigation/
│   └── organization/
└── subflows/           # reusable building blocks called via runFlow
```

Top-level `flows/` are the actual tests. `subflows/` are not run directly —
they exist to be invoked from a flow with `runFlow:`. Maestro picks up
everything matching `flows/**` (see `config.yaml`).

## Running locally

```bash
bun run e2e               # all flows
bun run e2e:auth          # one category
bun run e2e:smoke         # only flows tagged "smoke"
```

Requires:

- A booted iOS simulator (use `xcrun simctl list devices` to confirm).
- The dev build installed on that simulator (`bun run ios` once, or any
  EAS development build of the `dev` variant).
- Metro running on `http://localhost:8081` — `launch-dev-app.yaml` deep-links
  into it. Start it with `bun run dev`.

The `E2E_TEST_PASSWORD` env var is set in `config.yaml` and is the password
all generated test accounts use.

## Environment isolation — IMPORTANT

These flows hit the **real backend** that the dev build was compiled against
(Neon Postgres + the PowerSync sync service). Every run that goes through
`setup-signed-in-user`:

1. Generates a fresh user `e2e-${Date.now()}@test.svitlo.app`.
2. Triggers the BetterAuth `user.create.after` hook, which auto-creates a
   `Default` organization server-side.
3. Leaves all of that data behind. **There is no teardown.**

Do **not** run these flows against staging or production. Only run against a
dev backend you are comfortable accumulating throwaway `*@test.svitlo.app`
users in. A scheduled purge of test data is a known gap — see "Known gaps"
below.

## Authoring conventions

### Use testIDs over text

Maestro maps React Native `testID` to iOS `accessibilityIdentifier`. Always
prefer `tapOn: { id: '...' }` over a literal English string — translated
copy or copy edits will silently break text-based assertions.

```yaml
# good
- tapOn:
    id: 'header-submit'

# bad — breaks if i18n changes
- tapOn: 'Save'
```

Exceptions:

- System UI strings ("Open", "Continue", "Delete" in iOS alerts) — these are
  not under our control and have no testID.
- SwiftUI Menus rendered via `@expo/ui` (e.g. the org row ellipsis menu) —
  the native `MenuView.swift` does not currently apply
  `accessibilityIdentifier` from the JS `testID` prop, so menu triggers must
  be tapped by point. The menu items themselves can be tapped by text since
  they are SwiftUI labels with no other selector. See
  `flows/organization/rename-organization.yaml` for the documented pattern.

### testID naming

```
<area>-<element>[-<value>]
```

Examples actually used in this app:

- `home-screen`, `members-screen`, `drawer-content`
- `header-submit`, `drawer-toggle`, `drawer-sign-out`
- `home-actions-menu`, `home-action-settings`, `home-action-maintenance`
- `drawer-org-${name}`, `drawer-create-org`
- `email-auth-name-input`, `email-auth-email-input`, `email-auth-toggle-mode`
- `create-gen-title-input`, `create-gen-manual-mode`
- `gen-settings-title-input`, `gen-settings-delete`
- `create-template-name-input`, `create-template-hours-input`

### The `output.*` contract

Subflows that generate state (a fresh email, a generator title, an org name)
write it to `output.*` so the parent flow can reference the same value
later. Always **default** the value with `||` so callers can override:

```yaml
- evalScript: ${output.email = output.email || 'e2e-' + Date.now() + '@test.svitlo.app'}
```

Currently set by subflows:

| subflow                         | output                                        |
| ------------------------------- | --------------------------------------------- |
| `sign-up-fresh-user.yaml`       | `output.email`, `output.userName`             |
| `create-test-generator.yaml`    | `output.genTitle`, `output.genModel`          |
| `create-test-template.yaml`     | `output.templateName`, `output.templateHours` |
| `create-test-organization.yaml` | `output.orgName`                              |

`output.*` keys persist through chained `runFlow:` calls within the same
parent flow. Be careful with name collisions if you nest more than two
levels.

### iOS-specific gotchas captured in flows

Several flows have load-bearing comments about iOS quirks. Read them before
editing:

- **Strong Password autofill** — `subflows/sign-up-fresh-user.yaml` uses
  `pressKey: Enter` to advance between password fields instead of
  `tapOn`. Tapping a password field directly triggers iOS auto-fill and
  blocks input.
- **iOS 26 floating tab bar** — `flows/navigation/tab-navigation.yaml`
  visits the Members tab last. The Members screen has a search bar, which
  on iOS 26 collapses sibling tab labels into a floating pill.
- **Dev FAB** — `src/lib/hide-dev-fab.ts` disables the Expo dev menu FAB
  in dev builds so it doesn't intercept taps on `header-submit`.
- **ListGroup accessibility labels** — HeroUI Native's `ListGroup.Item`
  rolls children into a single iOS accessibility label like
  `"icon, Title, Description"`. Use a regex when matching by text:
  `tapOn: { text: '.*${output.templateName}.*' }`.
- **`hideKeyboard` reliability** — Maestro's iOS implementation does
  swipes in the middle of the screen, which can fire other gestures. The
  Maestro docs explicitly recommend tapping a non-interactive label as the
  workaround. `subflows/create-test-template.yaml` does this with the
  "Trigger Type" label.

## Tags

Flows declare `tags:` in their frontmatter. Current tags:

- `auth` `generators` `maintenance` `navigation` `organization` `team` —
  category tags, one per flow
- `smoke` — quickest "is anything totally broken" run; currently
  `email-sign-up` and `tab-navigation`

`bun run e2e:smoke` filters by the `smoke` tag.

## Known gaps

Captured here so they don't get rediscovered every quarter.

1. **No server-side cleanup.** Every run leaves test users, orgs,
   generators, and invitations in Neon. No purge job exists. The longer
   this goes unaddressed, the slower fresh sign-ups become as PowerSync
   sync streams take longer on first connect.
2. **No CI.** Flows are local-only — nothing runs them on PRs.
3. **iOS only.** `config.yaml` targets `com.devnazar.svitlo.dev` (the iOS
   dev bundle). Several flows depend on iOS-specific behavior. Web is not
   covered (it shouldn't be — the web target is landing-only) and Android
   is not currently a target per `CLAUDE.md`.
4. **No offline scenario.** PowerSync local-first behavior is the entire
   reason for the stack, but there's no flow that toggles the network and
   verifies offline writes. Maestro's `setAirplaneMode` is a no-op on iOS
   simulators, so this would need Network Link Conditioner or a custom
   `runScript` — neither is set up.
5. **Sign-up runs as setup for every test.** Each flow takes ~25s of
   setup just to sign up a fresh account. A shared seed user with stable
   data (used by every test that doesn't specifically exercise sign-up)
   would cut suite runtime significantly. Currently not implemented.
