// Silence i18next promotional banner during tests
const originalInfo = console.info
jest.spyOn(console, 'info').mockImplementation((...args) => {
  if (typeof args[0] === 'string' && args[0].includes('i18next')) return
  originalInfo(...args)
})

jest.mock('react-native-mmkv', () => {
  const store = new Map()
  return {
    createMMKV: () => ({
      getString: key => store.get(key),
      set: (key, value) => store.set(key, value),
      delete: key => store.delete(key),
      contains: key => store.has(key),
      clearAll: () => store.clear()
    })
  }
})
