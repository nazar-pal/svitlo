import { useGeneratorListData } from '@/lib/generator/use-generator-list-data'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'

export function useHomeData() {
  const localUser = useLocalUser()
  const userId = localUser?.id ?? ''
  const { userOrgs, isAdmin, isOrgsLoading } = useUserOrgs()
  const { selectedOrgId } = useSelectedOrg()

  const {
    generators,
    allSessions,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users
  } = useGeneratorListData()

  const admin = isAdmin(selectedOrgId)

  const myActiveSession =
    allSessions.find(s => !s.stoppedAt && s.startedByUserId === userId) ?? null

  return {
    userId,
    userOrgs,
    selectedOrgId,
    isOrgsLoading,
    admin,
    generators,
    sessionsByGenerator,
    nextMaintenanceByGenerator,
    assignmentsByGenerator,
    users,
    myActiveSession
  }
}
