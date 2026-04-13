import { useToast } from 'heroui-native'
import { useEffect, useRef, useState } from 'react'

import { InvitationDialog } from '@/components/invitation-dialog'
import {
  usePendingInvitations,
  type InvitationDetails
} from '@/lib/hooks/use-pending-invitations'
import { t } from '@/lib/i18n'

export function InvitationWatcher() {
  const pendingInvitations = usePendingInvitations()
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

    toast.show({
      variant: 'accent',
      placement: 'top',
      label: t('invitations.new', { count: newInvitations.length }),
      description: t('invitations.pending', { count: newInvitations.length }),
      actionLabel: t('invitations.view'),
      duration: 5000,
      onActionPress: ({ hide }) => {
        hide()
        setQueue(newInvitations)
      }
    })
  }, [pendingInvitations, toast])

  return <InvitationDialog invitations={queue} onClose={() => setQueue([])} />
}
