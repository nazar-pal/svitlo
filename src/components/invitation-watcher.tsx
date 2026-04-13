import { useToast } from 'heroui-native'
import { useEffect, useRef, useState } from 'react'

import { InvitationDialog } from '@/components/invitation-dialog'
import { getAllOrganizations, getAllUsers } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'
import { t } from '@/lib/i18n'
import {
  resolveInvitationDetails,
  type InvitationDetails
} from '@/lib/organization/resolve-invitation-details'

export function InvitationWatcher() {
  const pendingInvitations = usePendingInvitations()
  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())
  const { data: allUsers } = useDrizzleQuery(getAllUsers())
  const { toast } = useToast()
  const knownIdsRef = useRef<Set<string> | null>(null)
  const [queue, setQueue] = useState<InvitationDetails[]>([])

  useEffect(() => {
    const currentIds = new Set(pendingInvitations.map(inv => inv.id))

    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds
      return
    }

    const newInvitations = pendingInvitations.filter(
      inv => !knownIdsRef.current!.has(inv.id)
    )

    knownIdsRef.current = currentIds

    if (newInvitations.length === 0) return

    const snapshot = newInvitations.map(inv =>
      resolveInvitationDetails(inv, allOrgs, allUsers, t)
    )

    toast.show({
      variant: 'accent',
      placement: 'top',
      label: t('invitations.new', { count: snapshot.length }),
      description: t('invitations.pending', { count: snapshot.length }),
      actionLabel: t('invitations.view'),
      duration: 5000,
      onActionPress: ({ hide }) => {
        hide()
        setQueue(snapshot)
      }
    })
  }, [pendingInvitations, allOrgs, allUsers, toast])

  return <InvitationDialog invitations={queue} onClose={() => setQueue([])} />
}
