let resolveDb: () => void
let resolveUi: () => void

const databaseReady = new Promise<void>(r => {
  resolveDb = r
})
const uiReady = new Promise<void>(r => {
  resolveUi = r
})

export const appReadyPromise = Promise.all([databaseReady, uiReady]).then(
  () => {}
)

export function setDatabaseReady() {
  resolveDb()
}
export function setUIReady() {
  resolveUi()
}
