import {
  computeHomeReadiness,
  type HomeReadinessInput
} from '../compute-home-readiness'

function input(
  overrides: Partial<HomeReadinessInput> = {}
): HomeReadinessInput {
  return {
    hasUserId: true,
    hasGenerators: false,
    isOrgsLoading: false,
    hasUserOrgs: true,
    hasSelectedOrg: true,
    ...overrides
  }
}

describe('computeHomeReadiness', () => {
  it('waiting-for-user when there is no userId', () => {
    expect(computeHomeReadiness(input({ hasUserId: false }))).toEqual({
      kind: 'waiting-for-user'
    })
  })

  it('ready-generators-loaded when generators are present', () => {
    expect(computeHomeReadiness(input({ hasGenerators: true }))).toEqual({
      kind: 'ready-generators-loaded'
    })
  })

  it('ready-no-orgs when orgs query settled and user has no orgs', () => {
    expect(
      computeHomeReadiness(input({ isOrgsLoading: false, hasUserOrgs: false }))
    ).toEqual({ kind: 'ready-no-orgs' })
  })

  it('waiting-for-org-select when orgs exist but none selected', () => {
    expect(
      computeHomeReadiness(input({ hasUserOrgs: true, hasSelectedOrg: false }))
    ).toEqual({ kind: 'waiting-for-org-select' })
  })

  it('waiting-for-generators-settle when org selected but no generators yet', () => {
    expect(
      computeHomeReadiness(
        input({
          hasUserOrgs: true,
          hasSelectedOrg: true,
          hasGenerators: false
        })
      )
    ).toEqual({ kind: 'waiting-for-generators-settle' })
  })

  it('prefers waiting-for-user over any other readiness signal', () => {
    expect(
      computeHomeReadiness(
        input({
          hasUserId: false,
          hasGenerators: true,
          isOrgsLoading: false,
          hasUserOrgs: false
        })
      )
    ).toEqual({ kind: 'waiting-for-user' })
  })

  it('prefers ready-generators-loaded over ready-no-orgs when both are true', () => {
    // Edge case: stale orgs state but generators already loaded
    expect(
      computeHomeReadiness(
        input({
          hasGenerators: true,
          isOrgsLoading: false,
          hasUserOrgs: false
        })
      )
    ).toEqual({ kind: 'ready-generators-loaded' })
  })

  it('does not resolve to ready-no-orgs while orgs are still loading', () => {
    expect(
      computeHomeReadiness(
        input({
          isOrgsLoading: true,
          hasUserOrgs: false,
          hasSelectedOrg: false
        })
      )
    ).toEqual({ kind: 'waiting-for-org-select' })
  })
})
