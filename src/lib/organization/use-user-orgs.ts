import { getAllOrganizations, getUserMemberOrgIds } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUserId } from '@/lib/powersync/use-local-user'

export function useUserOrgs() {
  const userId = useLocalUserId()

  const { data: memberOrgIds } = useDrizzleQuery(
    userId ? getUserMemberOrgIds(userId) : undefined
  )

  const memberIdSet = new Set(memberOrgIds.map(m => m.organizationId))

  const { data: allOrgs, isLoading: isOrgsLoading } = useDrizzleQuery(
    getAllOrganizations()
  )

  const userOrgs = allOrgs.filter(
    org => org.adminUserId === userId || memberIdSet.has(org.id)
  )

  const isAdmin = (orgId: string | null) =>
    userOrgs.find(o => o.id === orgId)?.adminUserId === userId

  return { userOrgs, allOrgs, isAdmin, isOrgsLoading }
}
