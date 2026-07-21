// Parity helper for the policy suites: the async adapter attaches `facts`
// on both branches, but reactive `PolicyView` projects that away — strip
// `facts` so the two adapters' results can be compared shape-for-shape.
export function stripFacts(check: { ok: boolean; code?: string }) {
  return check.ok
    ? { status: 'ready', ok: true }
    : { status: 'ready', ok: false, code: check.code }
}
