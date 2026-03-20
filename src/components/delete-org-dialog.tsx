import { BlurView } from 'expo-blur'
import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  TextField,
  useToast
} from 'heroui-native'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { deleteOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { notifyWarning } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface DeleteOrgDialogProps {
  orgId: string | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteOrgDialog({
  orgId,
  onClose,
  onDeleted
}: DeleteOrgDialogProps) {
  const { userId } = useUserOrgs()
  const { toast } = useToast()
  const { data: orgs } = useDrizzleQuery(
    orgId ? getOrganization(orgId) : undefined
  )
  const orgName = orgs[0]?.name ?? ''

  const [confirmText, setConfirmText] = useState('')
  const isOpen = !!orgId
  const canDelete = confirmText === orgName && orgName.length > 0

  function close() {
    setConfirmText('')
    onClose()
  }

  async function handleDelete() {
    if (!orgId || !canDelete) return

    const result = await deleteOrganization(userId, orgId)
    if (!result.ok) return Alert.alert('Error', result.error)

    notifyWarning()
    toast.show({ variant: 'warning', label: `"${orgName}" deleted` })
    close()
    onDeleted?.()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) close()
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
              <Dialog.Title>Delete Organization</Dialog.Title>
              <Dialog.Description>
                This will permanently delete all generators, runs, maintenance
                records, and member associations. This action cannot be undone.
              </Dialog.Description>
            </View>

            <TextField isInvalid={confirmText.length > 0 && !canDelete}>
              <Label>Type &ldquo;{orgName}&rdquo; to confirm</Label>
              <Input
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={orgName}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {confirmText.length > 0 && !canDelete ? (
                <FieldError>Name does not match</FieldError>
              ) : null}
            </TextField>

            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" size="sm" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={!canDelete}
                onPress={handleDelete}
              >
                Delete
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
