import { BlurView } from 'expo-blur'
import { Button, Dialog, useToast } from 'heroui-native'
import { Alert, StyleSheet, View } from 'react-native'

import { leaveOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface LeaveOrgDialogProps {
  orgId: string | null
  onClose: () => void
  onLeft?: () => void
}

export function LeaveOrgDialog({
  orgId,
  onClose,
  onLeft
}: LeaveOrgDialogProps) {
  const { userId } = useUserOrgs()
  const { toast } = useToast()
  const { data: orgs } = useDrizzleQuery(
    orgId ? getOrganization(orgId) : undefined
  )
  const orgName = orgs[0]?.name ?? ''
  const isOpen = !!orgId

  async function handleLeave() {
    if (!orgId) return

    const result = await leaveOrganization(userId, orgId)
    if (!result.ok) return Alert.alert('Error', result.error)

    notifyWarning()
    toast.show({ variant: 'warning', label: `Left "${orgName}"` })
    onClose()
    onLeft?.()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay>
          <BlurView
            tint="systemMaterial"
            intensity={20}
            style={StyleSheet.absoluteFill}
          />
        </Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Close variant="ghost" className="self-end" />
          <View className="gap-5">
            <View className="gap-1.5">
              <Dialog.Title>Leave Organization</Dialog.Title>
              <Dialog.Description>
                You will be unassigned from all generators in &ldquo;
                {orgName}&rdquo;. To rejoin, an admin will need to invite you
                again.
              </Dialog.Description>
            </View>

            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" size="sm" onPress={onClose}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onPress={handleLeave}>
                Leave
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
