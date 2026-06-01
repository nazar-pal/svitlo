import { runDecisionAsync } from '@/data/shared/facts/async-adapter'

import { assignUserToGenerator, unassignUserFromGenerator } from '../decisions'

const ADMIN = 'user-admin'
const MEMBER = 'user-member'
const OUTSIDER = 'user-outsider'
const GENERATOR = 'gen-1'
const ORG = 'org-1'

const adminOrg = {
  'generator.orgId': ORG,
  'authz.org': { adminUserId: ADMIN }
}

function makeLookup(
  map: Record<string, unknown>
): (key: string, input: unknown) => Promise<unknown> {
  return async key => map[key] ?? null
}

// The assignment guard chains now live inline in each decision's `rule`
// (mirroring generators/decisions.ts). These drive them through the async
// adapter — the public seam — so the plan's short-circuit ordering and the
// rule's branches are covered together rather than poking the inlined guards.

describe('assignUserToGenerator decision', () => {
  it('rejects when the generator does not exist', async () => {
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({ 'generator.orgId': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', async () => {
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: MEMBER, generatorId: GENERATOR, targetUserId: OUTSIDER },
      makeLookup(adminOrg)
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'ONLY_ADMIN_CAN_ASSIGN_USERS'
    })
  })

  it('rejects when a non-self target is not an org member', async () => {
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: OUTSIDER },
      makeLookup({
        ...adminOrg,
        'orgMembership.hasForUserAndOrg': false,
        'assignment.hasForUserAndGenerator': false
      })
    )
    expect(result).toMatchObject({ ok: false, code: 'USER_NOT_ORG_MEMBER' })
  })

  it('accepts an admin self-assign and never looks up membership', async () => {
    const seen: string[] = []
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: ADMIN },
      (key, input) => {
        seen.push(key)
        return makeLookup({
          ...adminOrg,
          'assignment.hasForUserAndGenerator': false
        })(key, input)
      }
    )
    expect(result.ok).toBe(true)
    expect(seen).not.toContain('orgMembership.hasForUserAndOrg')
  })

  it('rejects when the user is already assigned', async () => {
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({
        ...adminOrg,
        'orgMembership.hasForUserAndOrg': true,
        'assignment.hasForUserAndGenerator': true
      })
    )
    expect(result).toMatchObject({ ok: false, code: 'USER_ALREADY_ASSIGNED' })
  })

  it('accepts the happy path', async () => {
    const result = await runDecisionAsync(
      assignUserToGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({
        ...adminOrg,
        'orgMembership.hasForUserAndOrg': true,
        'assignment.hasForUserAndGenerator': false
      })
    )
    expect(result.ok).toBe(true)
  })
})

describe('unassignUserFromGenerator decision', () => {
  it('rejects when the generator does not exist', async () => {
    const result = await runDecisionAsync(
      unassignUserFromGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({ 'generator.orgId': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', async () => {
    const result = await runDecisionAsync(
      unassignUserFromGenerator,
      { callerUserId: MEMBER, generatorId: GENERATOR, targetUserId: OUTSIDER },
      makeLookup(adminOrg)
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'ONLY_ADMIN_CAN_UNASSIGN_USERS'
    })
  })

  it('rejects when the assignment does not exist', async () => {
    const result = await runDecisionAsync(
      unassignUserFromGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({ ...adminOrg, 'assignment.hasForUserAndGenerator': false })
    )
    expect(result).toMatchObject({ ok: false, code: 'USER_NOT_ASSIGNED' })
  })

  it('accepts the happy path', async () => {
    const result = await runDecisionAsync(
      unassignUserFromGenerator,
      { callerUserId: ADMIN, generatorId: GENERATOR, targetUserId: MEMBER },
      makeLookup({ ...adminOrg, 'assignment.hasForUserAndGenerator': true })
    )
    expect(result.ok).toBe(true)
  })
})
