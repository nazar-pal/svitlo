## TypeScript

- Prefer `interface` over `type`
- Never use `enum`; use `as const` instead
- Don't add unnecessary `try`/`catch` blocks — use `tryCatch` or `asyncTryCatch` utilities
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
- `gh` CLI is installed and available
- Use `knip` to remove unused code when making large changes
