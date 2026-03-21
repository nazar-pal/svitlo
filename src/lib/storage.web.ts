interface Storage {
  getString(key: string): string | undefined
  set(key: string, value: string | boolean | number): void
  delete(key: string): void
  contains(key: string): boolean
  getAllKeys(): string[]
}

const PREFIX = 'svitlo:'

const hasLocalStorage =
  typeof localStorage !== 'undefined' &&
  typeof localStorage.getItem === 'function'

export const storage: Storage = {
  getString(key) {
    if (!hasLocalStorage) return undefined
    const value = localStorage.getItem(PREFIX + key)
    return value ?? undefined
  },
  set(key, value) {
    if (!hasLocalStorage) return
    localStorage.setItem(PREFIX + key, String(value))
  },
  delete(key) {
    if (!hasLocalStorage) return
    localStorage.removeItem(PREFIX + key)
  },
  contains(key) {
    if (!hasLocalStorage) return false
    return localStorage.getItem(PREFIX + key) !== null
  },
  getAllKeys() {
    if (!hasLocalStorage) return []
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length))
    }
    return keys
  }
}
