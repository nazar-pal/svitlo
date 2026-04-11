import type { OrganizationRef } from '../facts'
import { deleteOrganizationPolicy, renameOrganizationPolicy } from '../policy'

const ORG = 'org-1'
const ADMIN = 'admin-1'

function makeOrg(overrides: Partial<OrganizationRef> = {}): OrganizationRef {
  return { id: ORG, adminUserId: ADMIN, ...overrides }
}

describe('renameOrganizationPolicy', () => {
  it('rejects when the organization row is missing', () => {
    expect(
      renameOrganizationPolicy({ org: null, isCallerOrgAdmin: true })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('prefers ORGANIZATION_NOT_FOUND when both checks fail', () => {
    expect(
      renameOrganizationPolicy({ org: null, isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      renameOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_RENAME_ORG' })
  })

  it('accepts when the caller is the org admin', () => {
    expect(
      renameOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: true })
    ).toEqual({ ok: true })
  })
})

describe('deleteOrganizationPolicy', () => {
  it('rejects when the organization row is missing', () => {
    expect(
      deleteOrganizationPolicy({ org: null, isCallerOrgAdmin: true })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('prefers ORGANIZATION_NOT_FOUND when both checks fail', () => {
    expect(
      deleteOrganizationPolicy({ org: null, isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      deleteOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_DELETE_ORG' })
  })

  it('surfaces the resolved org on success', () => {
    const org = makeOrg()
    expect(deleteOrganizationPolicy({ org, isCallerOrgAdmin: true })).toEqual({
      ok: true,
      org
    })
  })
})
