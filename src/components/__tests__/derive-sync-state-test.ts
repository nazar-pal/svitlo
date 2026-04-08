import { type SyncStateInput, deriveSyncState } from '../derive-sync-state'

function makeInput(overrides?: Partial<SyncStateInput>): SyncStateInput {
  return {
    connected: true,
    connecting: false,
    uploading: false,
    uploadError: null,
    downloadError: null,
    sessionStatus: 'valid',
    rejectionsCount: 0,
    ...overrides
  }
}

describe('deriveSyncState', () => {
  describe('individual states', () => {
    it('returns changesNotSynced when rejectionsCount > 0', () => {
      expect(deriveSyncState(makeInput({ rejectionsCount: 3 }))).toEqual({
        key: 'changesNotSynced',
        loading: false
      })
    })

    it('returns syncError on uploadError', () => {
      expect(
        deriveSyncState(makeInput({ uploadError: new Error('fail') }))
      ).toEqual({ key: 'syncError', loading: false })
    })

    it('returns syncError on downloadError', () => {
      expect(
        deriveSyncState(makeInput({ downloadError: new Error('fail') }))
      ).toEqual({ key: 'syncError', loading: false })
    })

    it('returns syncingChanges when uploading', () => {
      expect(deriveSyncState(makeInput({ uploading: true }))).toEqual({
        key: 'syncingChanges',
        loading: true
      })
    })

    it('returns sessionExpired when expired and disconnected', () => {
      expect(
        deriveSyncState(
          makeInput({ sessionStatus: 'expired', connected: false })
        )
      ).toEqual({ key: 'sessionExpired', loading: false })
    })

    it('returns offline when not connected and not connecting', () => {
      expect(
        deriveSyncState(makeInput({ connected: false, connecting: false }))
      ).toEqual({ key: 'offline', loading: false })
    })

    it('returns connecting when connecting but not connected', () => {
      expect(
        deriveSyncState(makeInput({ connected: false, connecting: true }))
      ).toEqual({ key: 'connecting', loading: true })
    })

    it('returns allSynced by default', () => {
      expect(deriveSyncState(makeInput())).toEqual({
        key: 'allSynced',
        loading: false
      })
    })

    it('does not return sessionExpired when status is unknown', () => {
      expect(
        deriveSyncState(
          makeInput({ sessionStatus: 'unknown', connected: false })
        ).key
      ).toBe('offline')
    })
  })

  describe('priority trumping (concurrent states)', () => {
    it('rejections win over upload error', () => {
      expect(
        deriveSyncState(
          makeInput({ rejectionsCount: 1, uploadError: new Error('x') })
        ).key
      ).toBe('changesNotSynced')
    })

    it('upload error wins over uploading', () => {
      expect(
        deriveSyncState(
          makeInput({ uploadError: new Error('x'), uploading: true })
        ).key
      ).toBe('syncError')
    })

    it('uploading wins over sessionExpired', () => {
      expect(
        deriveSyncState(
          makeInput({
            uploading: true,
            sessionStatus: 'expired',
            connected: false
          })
        ).key
      ).toBe('syncingChanges')
    })

    it('sessionExpired wins over offline', () => {
      expect(
        deriveSyncState(
          makeInput({
            sessionStatus: 'expired',
            connected: false,
            connecting: false
          })
        ).key
      ).toBe('sessionExpired')
    })

    it('sessionExpired wins over connecting', () => {
      expect(
        deriveSyncState(
          makeInput({
            sessionStatus: 'expired',
            connected: false,
            connecting: true
          })
        ).key
      ).toBe('sessionExpired')
    })
  })
})
