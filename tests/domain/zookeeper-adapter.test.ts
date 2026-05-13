import { describe, expect, it } from 'vitest'

import {
  NodeZkClient,
  mapZooKeeperError,
} from '../../src/infrastructure/zookeeper/node-zk-client'

type FakeNodeClient = {
  once(event: string, cb: () => void): void
  connect(): void
  close(): void
  addAuthInfo(scheme: string, auth: Buffer): void
  getChildren(
    path: string,
    cb: (error: unknown, children?: string[]) => void,
  ): void
  getData(
    path: string,
    cb: (
      error: unknown,
      data?: Buffer,
      stat?: { version: number; numChildren: number },
    ) => void,
  ): void
  getACL(
    path: string,
    cb: (
      error: unknown,
      acl?: Array<{ perms: number; id: { scheme: string; id: string } }>,
    ) => void,
  ): void
  listSubTreeBFS(
    path: string,
    cb: (error: unknown, children?: string[]) => void,
  ): void
  create(path: string, data: Buffer, cb: (error: unknown) => void): void
  setData(
    path: string,
    data: Buffer,
    version: number,
    cb: (error: unknown) => void,
  ): void
  remove(path: string, version: number, cb: (error: unknown) => void): void
  setACL(
    path: string,
    acl: Array<{ perms: number; id: { scheme: string; id: string } }>,
    version: number,
    cb: (error: unknown) => void,
  ): void
}

type FactoryResult = {
  client: FakeNodeClient
  exception: Record<string, number>
  calls: Array<{
    connectionString: string
    options: { sessionTimeout: number }
  }>
  createClient: (
    connectionString: string,
    options: { sessionTimeout: number },
  ) => FakeNodeClient
  Exception: Record<string, number>
  Permission: Record<string, number>
  ACL: new (
    permission: number,
    id: unknown,
  ) => { permission: number; id: unknown }
  Id: new (scheme: string, id: string) => { scheme: string; id: string }
}

function makeFactory(): FactoryResult {
  let connectedHandler: (() => void) | undefined

  const client: FakeNodeClient = {
    once(event, cb) {
      if (event === 'connected') {
        connectedHandler = cb
      }
    },
    connect() {
      connectedHandler?.()
    },
    close() {},
    addAuthInfo() {},
    getChildren(_path, cb) {
      cb(null, ['app', 'config'])
    },
    getData(path, cb) {
      cb(null, Buffer.from(`data:${path}`), { version: 7, numChildren: 2 })
    },
    getACL(_path, cb) {
      cb(null, [
        { perms: 1 | 4, id: { scheme: 'world', id: 'anyone' } },
        { perms: 2 | 8 | 16, id: { scheme: 'auth', id: 'user:pw' } },
      ])
    },
    listSubTreeBFS(_path, cb) {
      cb(null, ['/', '/app', '/config', '/config/service'])
    },
    create(_path, _data, cb) {
      cb(null)
    },
    setData(_path, _data, _version, cb) {
      cb(null)
    },
    remove(_path, _version, cb) {
      cb(null)
    },
    setACL(_path, _acl, _version, cb) {
      cb(null)
    },
  }

  const createClientCalls: Array<{
    connectionString: string
    options: { sessionTimeout: number }
  }> = []

  const exception = {
    NO_NODE: -101,
    NODE_EXISTS: -110,
    BAD_VERSION: -103,
    CONNECTION_LOSS: -4,
  }

  return {
    client,
    exception,
    calls: createClientCalls,
    createClient(connectionString, options) {
      createClientCalls.push({ connectionString, options })
      return client
    },
    Exception: exception,
    Permission: {
      READ: 1,
      WRITE: 2,
      CREATE: 4,
      DELETE: 8,
      ADMIN: 16,
    },
    ACL: class {
      constructor(
        public permission: number,
        public id: unknown,
      ) {}
    },
    Id: class {
      constructor(
        public scheme: string,
        public id: string,
      ) {}
    },
  }
}

describe('NodeZkClient', () => {
  it('connects with the configured connection string and translates node snapshots', async () => {
    const factory = makeFactory()
    const authCalls: Array<{ scheme: string; auth: Buffer }> = []
    factory.client.addAuthInfo = (scheme, auth) => {
      authCalls.push({ scheme, auth })
    }
    const client = new NodeZkClient(
      {
        hosts: 'zk-1:2181,zk-2:2181',
        chroot: '/tenant-a',
        sessionTimeoutMs: 12_000,
        authSecret: 'digest-user:secret',
      },
      () => factory,
    )

    await client.connect()
    const snapshot = await client.getNode('/config')

    expect(factory.calls).toEqual([
      {
        connectionString: 'zk-1:2181,zk-2:2181/tenant-a',
        options: { sessionTimeout: 12_000 },
      },
    ])
    expect(authCalls).toEqual([
      { scheme: 'digest', auth: Buffer.from('digest-user:secret') },
    ])
    expect(snapshot).toEqual({
      path: '/config',
      data: Buffer.from('data:/config'),
      stat: { version: 7, numChildren: 2 },
      acl: [
        {
          scheme: 'world',
          id: 'anyone',
          permissions: ['read', 'create'],
        },
        {
          scheme: 'auth',
          id: 'user:pw',
          permissions: ['write', 'delete', 'admin'],
        },
      ],
    })
  })

  it('searches within the subtree listing returned by the underlying client', async () => {
    const client = new NodeZkClient(
      {
        hosts: 'zk-1:2181',
      },
      () => makeFactory(),
    )

    await client.connect()

    await expect(client.search('config')).resolves.toEqual([
      '/config',
      '/config/service',
    ])
  })

  it('maps ZooKeeper exception codes to stable app errors', () => {
    const exception = {
      NO_NODE: -101,
      NODE_EXISTS: -110,
      BAD_VERSION: -103,
      CONNECTION_LOSS: -4,
    }

    expect(
      mapZooKeeperError({ getCode: () => exception.NO_NODE }, exception),
    ).toBe('NODE_NOT_FOUND')
    expect(
      mapZooKeeperError({ getCode: () => exception.NODE_EXISTS }, exception),
    ).toBe('NODE_ALREADY_EXISTS')
    expect(
      mapZooKeeperError({ getCode: () => exception.BAD_VERSION }, exception),
    ).toBe('BAD_VERSION')
    expect(
      mapZooKeeperError({ getCode: () => exception.CONNECTION_LOSS }, exception),
    ).toBe('CONNECTION_LOST')
    expect(mapZooKeeperError(new Error('boom'), exception)).toBe(
      'UNKNOWN_FAILURE',
    )
  })

  it('wraps client callback failures with a mapped error code', async () => {
    const factory = makeFactory()
    factory.client.remove = (_path, _version, cb) => {
      cb({ getCode: () => factory.exception.BAD_VERSION })
    }
    const client = new NodeZkClient(
      {
        hosts: 'zk-1:2181',
      },
      () => factory,
    )

    await client.connect()

    await expect(client.deleteNode('/config', 3)).rejects.toMatchObject({
      code: 'BAD_VERSION',
    })
  })
})
