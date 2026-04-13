import type { TFunction } from 'i18next'

import { resolveInvitationDetails } from '../resolve-invitation-details'

const t = ((key: string) =>
  key === 'common.unknown' ? 'Unknown' : key) as unknown as TFunction

const invitation = {
  id: 'inv-1',
  organizationId: 'org-1',
  invitedByUserId: 'user-1'
}

describe('resolveInvitationDetails', () => {
  it('resolves both org and inviter when present', () => {
    const result = resolveInvitationDetails(
      invitation,
      [{ id: 'org-1', name: 'Acme' }],
      [{ id: 'user-1', name: 'Alice' }],
      t
    )
    expect(result).toEqual({
      id: 'inv-1',
      orgName: 'Acme',
      inviterName: 'Alice'
    })
  })

  it('falls back to Unknown when org is missing', () => {
    const result = resolveInvitationDetails(
      invitation,
      [],
      [{ id: 'user-1', name: 'Alice' }],
      t
    )
    expect(result.orgName).toBe('Unknown')
    expect(result.inviterName).toBe('Alice')
  })

  it('falls back to Unknown when inviter is missing or has no name', () => {
    const missingResult = resolveInvitationDetails(
      invitation,
      [{ id: 'org-1', name: 'Acme' }],
      [],
      t
    )
    expect(missingResult.inviterName).toBe('Unknown')

    const nullNameResult = resolveInvitationDetails(
      invitation,
      [{ id: 'org-1', name: 'Acme' }],
      [{ id: 'user-1', name: null }],
      t
    )
    expect(nullNameResult.inviterName).toBe('Unknown')
  })
})
