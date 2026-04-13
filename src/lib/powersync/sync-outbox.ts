export interface SyncRejectionEntry {
  table: string
  op: 'insert' | 'update' | 'delete'
  id: string
  reason: string
  timestamp: number
}

export interface SyncOutbox {
  recordRejection(entry: Omit<SyncRejectionEntry, 'timestamp'>): void
  clear(): void
  getRejections(): readonly SyncRejectionEntry[]
  subscribe(listener: () => void): () => void
}

export function createSyncOutbox(opts?: { now?: () => number }): SyncOutbox {
  const now = opts?.now ?? Date.now
  let rejections: readonly SyncRejectionEntry[] = []
  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) listener()
  }

  return {
    recordRejection(entry) {
      rejections = [...rejections, { ...entry, timestamp: now() }]
      notify()
    },
    clear() {
      rejections = []
      notify()
    },
    getRejections() {
      return rejections
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
