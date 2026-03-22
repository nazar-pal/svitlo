import { getAllGeneratorSessions } from '@/data/client/queries'
import { useGeneratorListData } from '@/lib/generator/use-generator-list-data'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'

export function useHomeData() {
  const localUser = useLocalUser()
  const userId = localUser?.id ?? ''
  const { userOrgs, isAdmin } = useUserOrgs()
  const { selectedOrgId } = useSelectedOrg()

  const {
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users
  } = useGeneratorListData()

  const { data: allSessions } = useDrizzleQuery(getAllGeneratorSessions())

  const admin = isAdmin(selectedOrgId)

  const myActiveSession =
    allSessions.find(s => !s.stoppedAt && s.startedByUserId === userId) ?? null

  return {
    userId,
    userOrgs,
    admin,
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users,
    myActiveSession
  }
}
