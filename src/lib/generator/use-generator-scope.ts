import { useState } from 'react'

import { getGeneratorsByOrg, getUserAssignments } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

export function useGeneratorScope() {
  const [generatorScope, setGeneratorScope] = useState<string | null>(null)
  const { selectedOrgId } = useSelectedOrg()
  const { userOrgs, isAdmin, userId } = useUserOrgs()
  const admin = isAdmin(selectedOrgId)

  const { data: generators } = useDrizzleQuery(
    selectedOrgId ? getGeneratorsByOrg(selectedOrgId) : undefined
  )

  const { data: myAssignments } = useDrizzleQuery(
    userId ? getUserAssignments(userId) : undefined
  )

  const orgGeneratorIds = new Set(generators.map(g => g.id))
  const myGeneratorIds = new Set(
    myAssignments
      .filter(a => orgGeneratorIds.has(a.generatorId))
      .map(a => a.generatorId)
  )

  const availableGenerators = admin
    ? generators
    : generators.filter(g => myGeneratorIds.has(g.id))

  const effectiveScope = generatorScope ?? (admin ? 'org' : 'my')

  const visibleGeneratorIds =
    effectiveScope === 'org'
      ? admin
        ? orgGeneratorIds
        : myGeneratorIds
      : effectiveScope === 'my'
        ? myGeneratorIds
        : new Set([effectiveScope])

  return {
    userOrgs,
    admin,
    userId,
    availableGenerators,
    effectiveScope,
    visibleGeneratorIds,
    setGeneratorScope
  }
}
