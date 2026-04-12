// Reactive bindings for the invitation lifecycle policy. Same pure functions
// as the mutation path (`src/data/shared/invitations/policy.ts`), but the
// facts arrive via `useDrizzleQuery` subscriptions instead of the async
// facts provider. Lets UI disable affordances before the user taps.

import { useOrgAuthzFacts } from '@/data/client/organizations/policy-hooks'
import { LOADING, type PolicyView } from '@/data/client/policy-hooks-shared'
import {
  findInvitationByOrgAndEmailQuery,
  getInvitationByIdQuery
} from '@/data/client/queries'
import {
  cancelInvitationPolicy,
  createInvitationPolicy
} from '@/data/shared/invitations/policy'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { db } from '@/lib/powersync/database'

// The Members screen uses this hook for the "invite button visible?"
// affordance before an email has been typed; when `inviteeEmail` is
// undefined we pass `alreadyInvited: false` so admins see the affordance and
// the Invite dialog re-checks with the real email before the mutation.
export function useCanCreateInvitation(
  userId: string | null | undefined,
  organizationId: string | null | undefined,
  inviteeEmail?: string | null
): PolicyView {
  const authz = useOrgAuthzFacts(userId, organizationId)

  const existsQuery =
    organizationId && inviteeEmail
      ? findInvitationByOrgAndEmailQuery(db, organizationId, inviteeEmail)
      : undefined
  const { data: existsRows, isLoading: existsLoading } =
    useDrizzleQuery(existsQuery)

  if (!userId || !organizationId || authz.status === 'loading') return LOADING
  if (inviteeEmail && existsLoading) return LOADING

  const result = createInvitationPolicy({
    isOrgAdmin: authz.isCallerOrgAdmin,
    alreadyInvited: inviteeEmail ? existsRows.length > 0 : false
  })
  return { status: 'ready', ...result }
}

// Two-stage subscription: first resolve the invitation to pull its
// `organizationId`, then subscribe to org authz. Mirrors the
// `useSessionPolicyContext` trick in `sessions/policy-hooks.ts`.
export function useCanCancelInvitation(
  userId: string | null | undefined,
  invitationId: string | null | undefined
): PolicyView {
  const invitationQuery = invitationId
    ? getInvitationByIdQuery(db, invitationId)
    : undefined
  const { data: invitationRows, isLoading: invitationLoading } =
    useDrizzleQuery(invitationQuery)

  const invitation = invitationRows[0]
  const organizationId = invitation?.organizationId ?? null

  const authz = useOrgAuthzFacts(userId, organizationId)

  if (!userId || !invitationId || invitationLoading) return LOADING

  if (!invitation)
    return { status: 'ready', ok: false, code: 'INVITATION_NOT_FOUND' }

  if (authz.status === 'loading') return LOADING

  const result = cancelInvitationPolicy({
    invitation: {
      organizationId: invitation.organizationId,
      inviteeEmail: invitation.inviteeEmail
    },
    isCallerOrgAdmin: authz.isCallerOrgAdmin
  })
  return { status: 'ready', ...result }
}
