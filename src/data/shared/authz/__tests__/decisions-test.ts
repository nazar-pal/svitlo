import { runDecisionAsync } from '@/data/shared/facts/async-adapter'

import {
  canAccessGenerator,
  isGeneratorOrgAdmin,
  isOrgAdmin
} from '../decisions'

const ADMIN = 'user-admin'
const MEMBER = 'user-member'
const OUTSIDER = 'user-outsider'
const ORG = 'org-1'
const GENERATOR = 'gen-1'

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

describe('isGeneratorOrgAdmin decision', () => {
  it('ok when the facts report the caller as the generator org admin', async () => {
    const result = await runDecisionAsync(
      isGeneratorOrgAdmin,
      { userId: ADMIN, generatorId: GENERATOR },
      makeLookup({
        'authz.generator': { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('NOT_AUTHORIZED when the generator does not exist', async () => {
    const result = await runDecisionAsync(
      isGeneratorOrgAdmin,
      { userId: ADMIN, generatorId: GENERATOR },
      makeLookup({ 'authz.generator': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })

  it('NOT_AUTHORIZED for a non-admin with an assignment', async () => {
    const result = await runDecisionAsync(
      isGeneratorOrgAdmin,
      { userId: MEMBER, generatorId: GENERATOR },
      makeLookup({
        'authz.generator': { orgAdminUserId: ADMIN, hasAssignment: true }
      })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })
})

describe('canAccessGenerator decision', () => {
  it('ok for the org admin without an assignment', async () => {
    const result = await runDecisionAsync(
      canAccessGenerator,
      { userId: ADMIN, generatorId: GENERATOR },
      makeLookup({
        'authz.generator': { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('ok for a non-admin with an assignment', async () => {
    const result = await runDecisionAsync(
      canAccessGenerator,
      { userId: MEMBER, generatorId: GENERATOR },
      makeLookup({
        'authz.generator': { orgAdminUserId: ADMIN, hasAssignment: true }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('NOT_AUTHORIZED for a non-admin without an assignment', async () => {
    const result = await runDecisionAsync(
      canAccessGenerator,
      { userId: OUTSIDER, generatorId: GENERATOR },
      makeLookup({
        'authz.generator': { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })

  it('NOT_AUTHORIZED when the generator does not exist', async () => {
    const result = await runDecisionAsync(
      canAccessGenerator,
      { userId: ADMIN, generatorId: GENERATOR },
      makeLookup({ 'authz.generator': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' })
  })
})
