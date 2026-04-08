export type SyncStateKey =
  | 'changesNotSynced'
  | 'syncError'
  | 'syncingChanges'
  | 'sessionExpired'
  | 'offline'
  | 'connecting'
  | 'allSynced'

export interface SyncStateInput {
  connected: boolean
  connecting: boolean
  uploading: boolean
  uploadError: unknown
  downloadError: unknown
  sessionStatus: 'valid' | 'expired' | 'unknown'
  rejectionsCount: number
}

export interface SyncState {
  key: SyncStateKey
  loading: boolean
}

export function deriveSyncState(input: SyncStateInput): SyncState {
  if (input.rejectionsCount > 0)
    return { key: 'changesNotSynced', loading: false }

  if (input.uploadError || input.downloadError)
    return { key: 'syncError', loading: false }

  if (input.uploading) return { key: 'syncingChanges', loading: true }

  if (input.sessionStatus === 'expired' && !input.connected)
    return { key: 'sessionExpired', loading: false }

  if (!input.connected && !input.connecting)
    return { key: 'offline', loading: false }

  if (input.connecting && !input.connected)
    return { key: 'connecting', loading: true }

  return { key: 'allSynced', loading: false }
}
