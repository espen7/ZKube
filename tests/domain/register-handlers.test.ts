import { beforeEach, describe, expect, it, vi } from 'vitest'

const registeredHandlers = new Map<string, (...args: unknown[]) => Promise<unknown> | unknown>()
const sendMock = vi.fn()

const sessionManagers: Array<{
  subscribers: Array<(event: { type: 'connectionStateChanged'; state: 'connected' | 'disconnected' | 'reconnecting' }) => void>
}> = []

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: sendMock,
        },
      },
    ]),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => Promise<unknown> | unknown) => {
      registeredHandlers.set(channel, handler)
    }),
  },
}))

vi.mock('../../src/domain/connections/connection-service', () => ({
  ConnectionService: class {
    list = vi.fn().mockResolvedValue([
      {
        id: 'cluster-a',
        name: 'Cluster A',
        hosts: '127.0.0.1:2181',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
      {
        id: 'cluster-b',
        name: 'Cluster B',
        hosts: '127.0.0.2:2181',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
    ])
    getSecret = vi.fn().mockResolvedValue(null)
    save = vi.fn()
    exportAll = vi.fn()
    importJson = vi.fn()
  },
}))

vi.mock('../../src/domain/zookeeper/session-manager', () => ({
  SessionManager: class {
    subscribers: Array<
      (event: {
        type: 'connectionStateChanged'
        state: 'connected' | 'disconnected' | 'reconnecting'
      }) => void
    > = []
    loadChildren = vi.fn()
    open = vi.fn()
    search = vi.fn()
    create = vi.fn()
    delete = vi.fn()
    update = vi.fn()
    saveAcl = vi.fn()

    constructor() {
      sessionManagers.push(this)
    }

    subscribe(
      cb: (event: {
        type: 'connectionStateChanged'
        state: 'connected' | 'disconnected' | 'reconnecting'
      }) => void,
    ) {
      this.subscribers.push(cb)
      return () => {
        this.subscribers = this.subscribers.filter((entry) => entry !== cb)
      }
    }

    async connect() {
      for (const subscriber of this.subscribers) {
        subscriber({
          type: 'connectionStateChanged',
          state: 'connected',
        })
      }
    }

    async disconnect() {
      for (const subscriber of this.subscribers) {
        subscriber({
          type: 'connectionStateChanged',
          state: 'disconnected',
        })
      }
    }
  },
}))

vi.mock('../../src/infrastructure/zookeeper/node-zk-client', () => ({
  NodeZkClient: class {},
}))

vi.mock('../../src/infrastructure/security/secret-store', () => ({
  SecretStore: class {},
}))

vi.mock('../../src/infrastructure/storage/connection-repository', () => ({
  ConnectionRepository: class {},
}))

vi.mock('../../src/infrastructure/storage/node-mark-repository', () => ({
  NodeMarkRepository: class {
    list = vi.fn().mockResolvedValue({})
    set = vi.fn()
    clear = vi.fn()
    clearConnection = vi.fn()
  },
}))

import { registerHandlers } from '../../electron/main/ipc/register-handlers'
import { channels } from '../../src/shared/ipc'

describe('registerHandlers connection switching', () => {
  beforeEach(() => {
    registeredHandlers.clear()
    sessionManagers.length = 0
    sendMock.mockReset()
  })

  it('emits a teardown event before announcing a successful connection switch', async () => {
    registerHandlers('D:/tmp/zkube')

    const connectHandler = registeredHandlers.get(channels.connectionConnect)

    expect(connectHandler).toBeDefined()

    await connectHandler?.({}, { connectionId: 'cluster-a' })
    expect(sendMock).toHaveBeenCalledWith(channels.runtimeEvent, {
      type: 'connectionStateChanged',
      state: 'connected',
    })

    sendMock.mockClear()

    await connectHandler?.({}, { connectionId: 'cluster-b' })

    expect(sendMock.mock.calls).toEqual([
      [
        channels.runtimeEvent,
        {
          type: 'connectionStateChanged',
          state: 'reconnecting',
        },
      ],
      [
        channels.runtimeEvent,
        {
          type: 'connectionStateChanged',
          state: 'connected',
        },
      ],
    ])
  })
})
