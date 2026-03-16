import { useSyncExternalStore } from 'react'

export interface SyncRejectionEntry {
  table: string
  op: string
  id: string
  reason: string
  timestamp: number
}

let rejections: SyncRejectionEntry[] = []
let listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function addRejection(entry: Omit<SyncRejectionEntry, 'timestamp'>) {
  rejections = [...rejections, { ...entry, timestamp: Date.now() }]
  notify()
}

export function clearRejections() {
  rejections = []
  notify()
}

function getSnapshot(): SyncRejectionEntry[] {
  return rejections
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSyncRejections(): SyncRejectionEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
