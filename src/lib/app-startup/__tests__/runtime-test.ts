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

import { createPowerSyncConnector } from '@/lib/powersync/connector'
import { powersync } from '@/lib/powersync/database'
import { createSyncOutbox, type SyncOutbox } from '@/lib/powersync/sync-outbox'

import { createDefaultPowerSyncRuntime } from '../runtime'

const initMock = powersync.init as jest.Mock
const connectMock = powersync.connect as jest.Mock
const disconnectMock = powersync.disconnect as jest.Mock
const registerListenerMock = powersync.registerListener as jest.Mock
const createConnectorMock = createPowerSyncConnector as jest.Mock

let outbox: SyncOutbox

beforeEach(() => {
  jest.clearAllMocks()
  outbox = createSyncOutbox({ now: () => 1_700_000_000_000 })
})

describe('createDefaultPowerSyncRuntime', () => {
  it('init() opens the database and registers the status listener exactly once', async () => {
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: jest.fn(),
      outbox
    })

    await runtime.init()
    await runtime.init()

    expect(initMock).toHaveBeenCalledTimes(2)
    expect(registerListenerMock).toHaveBeenCalledTimes(1)
  })

  it('connect() builds a connector and is idempotent until disconnect()', () => {
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: jest.fn(),
      outbox
    })

    runtime.connect()
    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledTimes(1)
    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('disconnect() tears down state and clears the outbox', () => {
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: jest.fn(),
      outbox
    })

    outbox.recordRejection({
      table: 'generator',
      op: 'insert',
      id: 'g1',
      reason: 'FK violation'
    })
    expect(outbox.getRejections()).toHaveLength(1)

    runtime.connect()
    runtime.disconnect()

    expect(disconnectMock).toHaveBeenCalledTimes(1)
    expect(outbox.getRejections()).toEqual([])
  })

  it('disconnect() is a no-op when not connected', () => {
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: jest.fn(),
      outbox
    })

    outbox.recordRejection({
      table: 'generator',
      op: 'insert',
      id: 'g1',
      reason: 'FK violation'
    })

    runtime.disconnect()

    expect(disconnectMock).not.toHaveBeenCalled()
    expect(outbox.getRejections()).toHaveLength(1)
  })

  it('connect() after disconnect() builds a fresh connector', () => {
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: jest.fn(),
      outbox
    })

    runtime.connect()
    runtime.disconnect()
    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledTimes(2)
    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('passes onAuthExpired and outbox through to the connector factory', () => {
    const onAuthExpired = jest.fn()
    const runtime = createDefaultPowerSyncRuntime({ onAuthExpired, outbox })

    runtime.connect()

    expect(createConnectorMock).toHaveBeenCalledWith({ onAuthExpired, outbox })
  })
})
