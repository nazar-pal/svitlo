import { render, screen } from '@testing-library/react-native'
import '@testing-library/react-native/build/matchers/extend-expect'
import React from 'react'

jest.mock('@powersync/react-native', () => ({
  useStatus: jest.fn()
}))

jest.mock('@/lib/auth/session-status-context', () => ({
  useSessionStatus: jest.fn()
}))

jest.mock('@/lib/powersync/sync-rejections', () => ({
  useSyncRejections: jest.fn()
}))

jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('heroui-native', () => ({
  Spinner: 'Spinner',
  useThemeColor: () => ['#888', '#f90', '#f00']
}))

const { useStatus } = jest.requireMock<{ useStatus: jest.Mock }>(
  '@powersync/react-native'
)
const { useSessionStatus } = jest.requireMock<{
  useSessionStatus: jest.Mock
}>('@/lib/auth/session-status-context')
const { useSyncRejections } = jest.requireMock<{
  useSyncRejections: jest.Mock
}>('@/lib/powersync/sync-rejections')

const { SyncStatusIndicator } = require('../sync-status-indicator')

function setupMocks(overrides?: {
  status?: Partial<ReturnType<typeof useStatus>>
  sessionStatus?: string
  rejections?: unknown[]
}) {
  useStatus.mockReturnValue({
    connected: true,
    connecting: false,
    dataFlowStatus: {
      uploading: false,
      downloading: false,
      uploadError: null,
      downloadError: null
    },
    ...overrides?.status
  })

  useSessionStatus.mockReturnValue({
    sessionStatus: overrides?.sessionStatus ?? 'valid',
    setSessionStatus: jest.fn()
  })

  useSyncRejections.mockReturnValue(overrides?.rejections ?? [])
}

beforeEach(() => {
  jest.resetAllMocks()
})

it('shows changesNotSynced when rejections present', () => {
  setupMocks({
    rejections: [
      { table: 'x', op: 'PUT', id: '1', reason: 'err', timestamp: 1 }
    ]
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.changesNotSynced')).toBeOnTheScreen()
})

it('shows syncError on upload error', () => {
  setupMocks({
    status: {
      dataFlowStatus: {
        uploading: false,
        downloading: false,
        uploadError: new Error('fail'),
        downloadError: null
      }
    }
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.syncError')).toBeOnTheScreen()
})

it('shows syncError on download error', () => {
  setupMocks({
    status: {
      dataFlowStatus: {
        uploading: false,
        downloading: false,
        uploadError: null,
        downloadError: new Error('fail')
      }
    }
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.syncError')).toBeOnTheScreen()
})

it('shows syncingChanges when uploading', () => {
  setupMocks({
    status: {
      dataFlowStatus: {
        uploading: true,
        downloading: false,
        uploadError: null,
        downloadError: null
      }
    }
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.syncingChanges')).toBeOnTheScreen()
})

it('shows sessionExpired when session expired and disconnected', () => {
  setupMocks({
    status: { connected: false, connecting: false },
    sessionStatus: 'expired'
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.sessionExpired')).toBeOnTheScreen()
})

it('shows offline when not connected and not connecting', () => {
  setupMocks({
    status: { connected: false, connecting: false }
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.offline')).toBeOnTheScreen()
})

it('shows connecting when connecting', () => {
  setupMocks({
    status: { connected: false, connecting: true }
  })

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.connecting')).toBeOnTheScreen()
})

it('shows allSynced when everything is good', () => {
  setupMocks()

  render(<SyncStatusIndicator />)

  expect(screen.getByText('sync.allSynced')).toBeOnTheScreen()
})
