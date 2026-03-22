let resolveDb: () => void
let resolveUi: () => void

const databaseReady = new Promise<void>(r => {
  resolveDb = r
})
const uiReady = new Promise<void>(r => {
  resolveUi = r
})

const SAFETY_TIMEOUT_MS = 10_000

export const appReadyPromise: Promise<void> = Promise.race([
  Promise.all([databaseReady, uiReady]),
  new Promise<void>(resolve =>
    setTimeout(() => {
      console.warn('[app-ready] Safety timeout fired — forcing app ready')
      resolveDb()
      resolveUi()
      resolve()
    }, SAFETY_TIMEOUT_MS)
  )
]).then(() => {})

export function setDatabaseReady() {
  resolveDb()
}
export function setUIReady() {
  resolveUi()
}
