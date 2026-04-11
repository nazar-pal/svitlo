jest.mock('@/lib/powersync/database', () => ({
  powersync: {
    init: jest.fn(async () => {}),
    connect: jest.fn(),
    disconnect: jest.fn(),
    registerListener: jest.fn(() => () => {})
  }
}))

jest.mock('@/lib/powersync/connector', () => ({
  createPowerSyncConnector: jest.fn(() => ({ marker: 'connector' }))
}))

jest.mock('@/lib/powersync/sync-rejections', () => ({
  clearRejections: jest.fn()
}))

import { createPowerSyncConnector } from '@/lib/powersync/connector'
import { powersync } from '@/lib/powersync/database'
import { clearRejections } from '@/lib/powersync/sync-rejections'

import { createDefaultPowerSyncRuntime } from '../runtime'

const initMock = powersync.init as jest.Mock
const connectMock = powersync.connect as jest.Mock
const disconnectMock = powersync.disconnect as jest.Mock
const registerListenerMock = powersync.registerListener as jest.Mock
const createConnectorMock = createPowerSyncConnector as jest.Mock
const clearRejectionsMock = clearRejections as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createDefaultPowerSyncRuntime', () => {
  it('init() opens the database and registers the status listener exactly once', async () => {
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired: jest.fn() })

    await runtime.init()
    await runtime.init()

    expect(initMock).toHaveBeenCalledTimes(2)
    expect(registerListenerMock).toHaveBeenCalledTimes(1)
  })

  it('connect() builds a connector and is idempotent until disconnect()', () => {
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired: jest.fn() })

    runtime.connect()
    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledTimes(1)
    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('disconnect() tears down state and clears rejections', () => {
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired: jest.fn() })

    runtime.connect()
    runtime.disconnect()

    expect(disconnectMock).toHaveBeenCalledTimes(1)
    expect(clearRejectionsMock).toHaveBeenCalledTimes(1)
  })

  it('disconnect() is a no-op when not connected', () => {
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired: jest.fn() })

    runtime.disconnect()

    expect(disconnectMock).not.toHaveBeenCalled()
    expect(clearRejectionsMock).not.toHaveBeenCalled()
  })

  it('connect() after disconnect() builds a fresh connector', () => {
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired: jest.fn() })

    runtime.connect()
    runtime.disconnect()
    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledTimes(2)
    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('passes onAuthExpired through to the connector factory', () => {
    const onAuthExpired = jest.fn()
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired })

    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledWith({ onAuthExpired })
  })
})
