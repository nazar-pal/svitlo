import { useToast } from 'heroui-native'
import { useEffect, useRef, useState } from 'react'

import { InvitationDialog } from '@/components/invitation-dialog'
import { usePendingInvitations } from '@/lib/hooks/use-pending-invitations'

export function InvitationWatcher() {
  const pendingInvitations = usePendingInvitations()
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const knownIdsRef = useRef<Set<string> | null>(null)
  const [queue, setQueue] = useState<string[]>([])

  useEffect(() => {
    const currentIds = new Set(pendingInvitations.map(inv => inv.id))

    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds
      return
    }

    const newIds = pendingInvitations
      .filter(inv => !knownIdsRef.current!.has(inv.id))
      .map(inv => inv.id)

    knownIdsRef.current = currentIds

    if (newIds.length === 0) return
    showToast(newIds)

    function showToast(ids: string[]) {
      const plural = ids.length > 1
      toastRef.current.show({
        variant: 'accent',
        placement: 'top',
        label: plural ? `${ids.length} New Invitations` : 'New Invitation',
        description: plural
          ? `You have ${ids.length} pending organization invitations`
          : 'You have a pending organization invitation',
        actionLabel: 'View',
        duration: 5000,
        onActionPress: ({ hide }) => {
          hide()
          setQueue(ids)
        }
      })
    }
  }, [pendingInvitations])

  return <InvitationDialog invitationIds={queue} onClose={() => setQueue([])} />
}
