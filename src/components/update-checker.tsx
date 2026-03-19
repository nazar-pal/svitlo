import * as Updates from 'expo-updates'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useToast } from 'heroui-native'

export function UpdateChecker() {
  const { toast } = useToast()
  const toastShownRef = useRef(false)
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    currentlyRunning,
    downloadedUpdate
  } = Updates.useUpdates()

  useEffect(() => {
    if (!Updates.isEnabled || !isUpdateAvailable || isDownloading) return
    Updates.fetchUpdateAsync().catch(console.warn)
  }, [isUpdateAvailable, isDownloading])

  useEffect(() => {
    if (!isUpdatePending || toastShownRef.current) return
    // After reloadAsync() the native state machine may still report the
    // previously downloaded update as "pending" before it settles. Skip the
    // toast when the downloaded update is already the one we're running.
    if (
      !downloadedUpdate?.updateId ||
      downloadedUpdate.updateId === currentlyRunning.updateId
    )
      return
    toastShownRef.current = true
    toast.show({
      variant: 'accent',
      placement: 'bottom',
      label: 'Update Available',
      description: 'Restart to get the latest version',
      actionLabel: 'Restart',
      duration: 'persistent',
      onActionPress: ({ hide }) => {
        hide()
        Updates.reloadAsync().catch(console.warn)
      }
    })
  }, [isUpdatePending, downloadedUpdate, currentlyRunning, toast])

  useEffect(() => {
    if (!Updates.isEnabled) return
    Updates.checkForUpdateAsync().catch(console.warn)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') Updates.checkForUpdateAsync().catch(console.warn)
    })
    return () => subscription.remove()
  }, [])

  return null
}
