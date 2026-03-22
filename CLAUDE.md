## Platform Architecture

This is an Expo project with two completely separate platform targets:

- **iOS** — the actual application. Uses `_layout.native.tsx` at the root, goes through AuthGate, and renders the full app (auth, drawer, tabs, etc.)
- **Web** — a minimal website only. Uses `_layout.tsx` at the root and only serves the landing page, privacy policy, and API routes (`src/app/api/`). Web never shows the iOS app UI

## TypeScript

- Prefer `interface` over `type`
- Never use `enum`; use `as const` instead
- Don't add unnecessary `try`/`catch` blocks
- Don't cast to `any`. Avoid `as` unless absolutely necessary
- Only create abstractions when actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression suffices
- Avoid braces `{}` when possible (single-line returns, single-line if statements)
- Prefer switch statements with a default branch that throws using `satisfies never` for exhaustive union handling

## React

- Break massive JSX into smaller composed components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely necessary
- Don't use `useMemo`, `useCallback`, or `React.memo` by default — trust the React Compiler. Only add memoization if lint issues prevent file-level memoization

## UI/UX

- Use default HeroUiNative component styling — built-in variants, props, and sizes over custom class names
- Keep designs minimalistic following iOS design principles
- This app is local-first — loading states are rarely needed

## Validation Architecture

3-layer validation for offline-first correctness:

1. **Client Zod schemas** (`src/data/client/validation/`) — field-level constraints, immediate UX feedback
2. **Client mutations** (`src/data/client/mutations/`) — authorization, FK existence checks, cross-table business rules
3. **PostgreSQL constraints + triggers** (`src/data/server/db-schema/`, migrations) — final safety net, enforced even if client validation is bypassed

Redundancy between layers is intentional: client validates for UX, server enforces for security.

## Commands

- `bun run lint` — run after changes, fix all errors
- `bun run typecheck` — run after changes, fix all errors
- `bun run test` — run all tests
- `gh` CLI is installed and available
- Use `knip` to remove unused code when making large changes

## Testing

- `bun run test` — run all tests
- `bun run test:watch` — run in watch mode during development
- Tests are co-located in `__tests__/` directories next to source files
- Test files use `*-test.ts` naming convention
- Assert on error structure (field presence, ok/false), not on translated message strings
- Mutation tests mock `@/lib/powersync/database` and auth helpers from `./helpers` — see `mock-db.ts` for shared chain helpers
- Use `jest.resetAllMocks()` in `beforeEach` for mutation tests

<!-- HEROUI-NATIVE-AGENTS-MD-START -->

[HeroUI Native Docs Index]|root: ./.heroui-docs/native|STOP. What you remember about HeroUI Native is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --native --output AGENTS.md|components/(buttons):{button.mdx,close-button.mdx,link-button.mdx}|components/(collections):{menu.mdx,tag-group.mdx}|components/(controls):{slider.mdx,switch.mdx}|components/(data-display):{chip.mdx}|components/(feedback):{alert.mdx,skeleton-group.mdx,skeleton.mdx,spinner.mdx}|components/(forms):{checkbox.mdx,control-field.mdx,description.mdx,field-error.mdx,input-group.mdx,input-otp.mdx,input.mdx,label.mdx,radio-group.mdx,search-field.mdx,select.mdx,text-area.mdx,text-field.mdx}|components/(layout):{card.mdx,separator.mdx,surface.mdx}|components/(media):{avatar.mdx}|components/(navigation):{accordion.mdx,list-group.mdx,tabs.mdx}|components/(overlays):{bottom-sheet.mdx,dialog.mdx,popover.mdx,toast.mdx}|components/(utilities):{pressable-feedback.mdx,scroll-shadow.mdx}|getting-started/(handbook):{animation.mdx,colors.mdx,composition.mdx,portal.mdx,provider.mdx,styling.mdx,theming.mdx}|getting-started/(overview):{design-principles.mdx,quick-start.mdx}|getting-started/(ui-for-agents):{agent-skills.mdx,agents-md.mdx,llms-txt.mdx,mcp-server.mdx}|releases:{beta-10.mdx,beta-11.mdx,beta-12.mdx,beta-13.mdx,rc-1.mdx,rc-2.mdx,rc-3.mdx,rc-4.mdx,v1-0-0.mdx}

<!-- HEROUI-NATIVE-AGENTS-MD-END -->
