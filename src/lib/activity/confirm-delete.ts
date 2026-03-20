import { Alert } from 'react-native'

import { deleteMaintenanceRecord, deleteSession } from '@/data/client/mutations'
import { notifyWarning } from '@/lib/haptics'

export function confirmDeleteSession(userId: string, sessionId: string) {
  Alert.alert('Delete Run', 'Are you sure you want to delete this run?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        const result = await deleteSession(userId, sessionId)
        if (!result.ok) return Alert.alert('Error', result.error)
        notifyWarning()
      }
    }
  ])
}

export function confirmDeleteRecord(userId: string, recordId: string) {
  Alert.alert(
    'Delete Record',
    'Are you sure you want to delete this maintenance record?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteMaintenanceRecord(userId, recordId)
          if (!result.ok) return Alert.alert('Error', result.error)
          notifyWarning()
        }
      }
    ]
  )
}
