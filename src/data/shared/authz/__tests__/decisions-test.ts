import { runDecisionAsync } from '@/data/shared/facts/async-adapter'

import { isOrgAdmin } from '../decisions'

const ADMIN = 'user-admin'
const MEMBER = 'user-member'
const ORG = 'org-1'

// Hand-rolled lookup stub — each test declares which fact keys resolve to
// what, so the decision layer stays dialect-free. Mirrors the async adapter
// contract: `(key, input) => Promise<unknown>`.
function makeLookup(
  map: Record<string, unknown>
): (key: string, input: unknown) => Promise<unknown> {
  return async key => map[key] ?? null
}

describe('isOrgAdmin decision', () => {
  it('ok when the facts report a matching admin', async () => {
    const result = await runDecisionAsync(
      isOrgAdmin,
      { userId: ADMIN, orgId: ORG },
      makeLookup({ 'authz.org': { adminUserId: ADMIN } })
    )
    expect(result.ok).toBe(true)
  })

  it('NOT_AUTHORIZED when the org does not exist', async () => {
    const result = await runDecisionAsync(
      isOrgAdmin,
      { userId: ADMIN, orgId: ORG },
      makeLookup({ 'authz.org': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })

  it('NOT_AUTHORIZED for a non-admin caller', async () => {
    const result = await runDecisionAsync(
      isOrgAdmin,
      { userId: MEMBER, orgId: ORG },
      makeLookup({ 'authz.org': { adminUserId: ADMIN } })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })
})
