// Silence i18next promotional banner during tests
const originalInfo = console.info
jest.spyOn(console, 'info').mockImplementation((...args) => {
  if (typeof args[0] === 'string' && args[0].includes('i18next')) return
  originalInfo(...args)
})

jest.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }))

jest.mock('react-native-mmkv', () => {
  const store = new Map()
  globalThis.__mmkvTestStore = store
  return {
    createMMKV: () => ({
      getString: key => store.get(key),
      set: (key, value) => store.set(key, value),
      remove: key => store.delete(key),
      delete: key => store.delete(key),
      contains: key => store.has(key),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys())
    })
  }
})
