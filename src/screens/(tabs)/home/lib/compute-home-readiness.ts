type HomeReadiness =
  | { kind: 'waiting-for-user' }
  | { kind: 'ready-generators-loaded' }
  | { kind: 'ready-no-orgs' }
  | { kind: 'waiting-for-org-select' }
  | { kind: 'waiting-for-generators-settle' }

export interface HomeReadinessInput {
  hasUserId: boolean
  hasGenerators: boolean
  isOrgsLoading: boolean
  hasUserOrgs: boolean
  hasSelectedOrg: boolean
}

export function computeHomeReadiness(input: HomeReadinessInput): HomeReadiness {
  if (!input.hasUserId) return { kind: 'waiting-for-user' }
  if (input.hasGenerators) return { kind: 'ready-generators-loaded' }
  if (!input.isOrgsLoading && !input.hasUserOrgs)
    return { kind: 'ready-no-orgs' }
  if (!input.hasSelectedOrg) return { kind: 'waiting-for-org-select' }
  return { kind: 'waiting-for-generators-settle' }
}
