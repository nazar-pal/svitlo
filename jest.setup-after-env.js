// Clear MMKV mock state between tests to prevent leakage
beforeEach(() => {
  globalThis.__mmkvTestStore?.clear()
})
