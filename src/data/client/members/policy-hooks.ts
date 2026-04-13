// Reactive bindings for the member lifecycle policy. Same pure functions as
// the mutation path (`src/data/shared/members`), but the facts arrive via
// `useDrizzleQuery` subscriptions instead of the async facts provider. Lets
// UI disable affordances before the user taps.

import { useOrgAuthzFacts } from '@/data/client/organizations/policy-hooks'
import { LOADING, type PolicyView } from '@/data/client/policy-hooks-shared'
import { getMembershipByIdQuery } from '@/data/client/queries'
import { removeMemberPolicy } from '@/data/shared/members'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { db } from '@/lib/powersync/database'

// Two-stage subscription: first resolve the membership row to pull its
// `organizationId`, then subscribe to org authz (which also carries the
// `adminUserId` the policy needs). Mirrors the async check's `!member`
// short-circuit in `members/checks.ts` — when the row is missing we return
// MEMBER_NOT_FOUND without waiting on authz.
export function useCanRemoveMember(
  userId: string | null | undefined,
  memberId: string | null | undefined
): PolicyView {
  const memberQuery = memberId
    ? getMembershipByIdQuery(db, memberId)
    : undefined
  const { data: memberRows, isLoading: memberLoading } =
    useDrizzleQuery(memberQuery)

  const row = memberRows[0]
  const organizationId = row?.organizationId ?? null

  const authz = useOrgAuthzFacts(userId, organizationId)

  if (!userId || !memberId || memberLoading) return LOADING

  if (!row) return { status: 'ready', ok: false, code: 'MEMBER_NOT_FOUND' }

  if (authz.status === 'loading') return LOADING

  const result = removeMemberPolicy({
    member: {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId
    },
    isCallerOrgAdmin: authz.isCallerOrgAdmin,
    adminUserId: authz.org?.adminUserId ?? null
  })
  // `removeMemberPolicy` carries the resolved `member` + `adminUserId` on
  // success so the mutation path can drive the transfer-and-delete side
  // effect without a second lookup; UI only cares about ok/code, so project
  // into the narrower `PolicyView`.
  if (result.ok) return { status: 'ready', ok: true }
  return { status: 'ready', ok: false, code: result.code }
}
