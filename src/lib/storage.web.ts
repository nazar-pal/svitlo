interface Storage {
  getString(key: string): string | undefined
  set(key: string, value: string | boolean | number): void
  delete(key: string): void
  contains(key: string): boolean
  getAllKeys(): string[]
}

const PREFIX = 'svitlo:'

export const storage: Storage = {
  getString(key) {
    const value = localStorage.getItem(PREFIX + key)
    return value ?? undefined
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, String(value))
  },
  delete(key) {
    localStorage.removeItem(PREFIX + key)
  },
  contains(key) {
    return localStorage.getItem(PREFIX + key) !== null
  },
  getAllKeys() {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length))
    }
    return keys
  }
}
