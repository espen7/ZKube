import nodeZkModule from 'node-zookeeper-client'

import type { ZooKeeperClient } from '../../domain/zookeeper/client'
import type { AppErrorCode } from '../../shared/errors'
import type {
  AclEntry,
  NodeSnapshot,
  TreeNodeRow,
} from '../../shared/models/node'

type ConnectionConfig = {
  hosts: string
  chroot?: string
  sessionTimeoutMs?: number
  authSecret?: string
}

type NodeZkStat = {
  version: number
  numChildren: number
  mtime?: number | null | Buffer | Uint8Array
  dataLength?: number | null
}

type NodeZkAclRecord = {
  permission?: number
  perms?: number
  id: {
    scheme: string
    id: string
  }
}

type NodeZkExceptionLike = {
  getCode(): number
}

type NodeZkClientInstance = {
  on?(event: string, cb: () => void): void
  once(event: string, cb: () => void): void
  removeListener?(event: string, cb: () => void): void
  connect(): void
  close(): void
  addAuthInfo(scheme: string, auth: Buffer): void
  getChildren(
    path: string,
    cb: (error: unknown, children?: string[]) => void,
  ): void
  getData(
    path: string,
    cb: (error: unknown, data?: Buffer, stat?: NodeZkStat) => void,
  ): void
  getACL(
    path: string,
    cb: (error: unknown, acl?: NodeZkAclRecord[]) => void,
  ): void
  listSubTreeBFS(
    path: string,
    cb: (error: unknown, paths?: string[]) => void,
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
    acl: unknown[],
    version: number,
    cb: (error: unknown) => void,
  ): void
}

type NodeZkModule = {
  createClient(
    connectionString: string,
    options: { sessionTimeout: number },
  ): NodeZkClientInstance
  Exception: Record<string, number>
  Permission: Record<string, number>
  ACL: new (
    permission: number,
    id: unknown,
  ) => unknown
  Id: new (scheme: string, id: string) => unknown
}

type NodeZkFactory = () => NodeZkModule

const PERMISSIONS = [
  ['read', 'READ'],
  ['write', 'WRITE'],
  ['create', 'CREATE'],
  ['delete', 'DELETE'],
  ['admin', 'ADMIN'],
] as const

function loadNodeZkModule(): NodeZkModule {
  return nodeZkModule as NodeZkModule
}

export function mapZooKeeperError(
  error: unknown,
  exception = loadNodeZkModule().Exception,
): AppErrorCode {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'getCode' in error &&
    typeof error.getCode === 'function'
      ? (error as NodeZkExceptionLike).getCode()
      : undefined

  switch (code) {
    case exception.NO_NODE:
      return 'NODE_NOT_FOUND'
    case exception.NOT_EMPTY:
      return 'NODE_NOT_EMPTY'
    case exception.NODE_EXISTS:
      return 'NODE_ALREADY_EXISTS'
    case exception.BAD_VERSION:
      return 'BAD_VERSION'
    case exception.CONNECTION_LOSS:
      return 'CONNECTION_LOST'
    default:
      return 'UNKNOWN_FAILURE'
  }
}

export class NodeZkClient implements ZooKeeperClient {
  private client: NodeZkClientInstance | null = null
  private connectionLossSubscribers = new Set<() => void>()
  private releaseConnectionLossHandlers: (() => void) | null = null
  private connectionLossNotified = false

  constructor(
    private readonly connection: ConnectionConfig,
    private readonly factory: NodeZkFactory = loadNodeZkModule,
  ) {}

  async connect(): Promise<void> {
    const module = this.factory()
    const connectTimeoutMs = this.connection.sessionTimeoutMs ?? 30_000
    const client = module.createClient(buildConnectionString(this.connection), {
      sessionTimeout: connectTimeoutMs,
    })

    if (this.connection.authSecret) {
      client.addAuthInfo('digest', Buffer.from(this.connection.authSecret))
    }

    this.client = client
    this.connectionLossNotified = false

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        rejectConnect(
          createAppError(
            'CONNECTION_TIMEOUT',
            `ZooKeeper connection timed out after ${connectTimeoutMs}ms`,
          ),
        )
      }, connectTimeoutMs)
      const cleanup = () => {
        clearTimeout(timeout)
        client.removeListener?.('connected', handleConnected)
        client.removeListener?.('connectedReadOnly', handleConnectedReadOnly)
        client.removeListener?.('authenticationFailed', handleAuthenticationFailed)
        client.removeListener?.('expired', handleSessionExpired)
      }
      const rejectConnect = (error: Error & { code: AppErrorCode }) => {
        cleanup()
        client.close()
        if (this.client === client) {
          this.client = null
        }
        reject(error)
      }
      const handleConnected = () => {
        cleanup()
        this.attachConnectionLossHandlers(client)
        resolve()
      }
      const handleConnectedReadOnly = () => {
        rejectConnect(
          createAppError(
            'UNKNOWN_FAILURE',
            'Read-only ZooKeeper sessions are not supported',
          ),
        )
      }
      const handleAuthenticationFailed = () => {
        rejectConnect(
          createAppError(
            'UNKNOWN_FAILURE',
            'ZooKeeper authentication failed',
          ),
        )
      }
      const handleSessionExpired = () => {
        rejectConnect(
          createAppError(
            'CONNECTION_LOST',
            'ZooKeeper session expired before the session was established',
          ),
        )
      }

      client.once('connected', handleConnected)
      client.once('connectedReadOnly', handleConnectedReadOnly)
      client.once('authenticationFailed', handleAuthenticationFailed)
      client.once('expired', handleSessionExpired)
      client.connect()
    })
  }

  async close(): Promise<void> {
    this.releaseConnectionLossHandlers?.()
    this.releaseConnectionLossHandlers = null
    this.client?.close()
    this.client = null
    this.connectionLossNotified = false
  }

  watchConnectionLoss(cb: () => void): () => void {
    this.connectionLossSubscribers.add(cb)
    this.attachConnectionLossHandlers(this.client)

    return () => {
      this.connectionLossSubscribers.delete(cb)
    }
  }

  async getChildren(path: string): Promise<TreeNodeRow[]> {
    const children = await new Promise<string[]>((resolve, reject) => {
      this.requireClient().getChildren(path, (error, childNames = []) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve(childNames)
      })
    })

    return Promise.all(
      children.map(async (childName) => {
        const childPath = joinChildPath(path, childName)

        try {
          const { data, stat } = await this.getNodeData(childPath)
          return {
            path: childPath,
            name: childName,
            hasChildren: (stat?.numChildren ?? 0) > 0,
            dataLength: data.length,
            mtime: stat?.mtime ?? null,
          } satisfies TreeNodeRow
        } catch {
          return {
            path: childPath,
            name: childName,
            hasChildren: false,
            dataLength: null,
            mtime: null,
          } satisfies TreeNodeRow
        }
      }),
    )
  }

  async getNode(path: string): Promise<NodeSnapshot> {
    const [dataResult, acl] = await Promise.all([
      this.getNodeData(path),
      new Promise<AclEntry[]>((resolve, reject) => {
        this.requireClient().getACL(path, (error, aclRecords = []) => {
          if (error) {
            reject(this.toAppError(error))
            return
          }

          resolve(aclRecords.map((entry) => decodeAcl(entry)))
        })
      }),
    ])

    return {
      path,
      data: dataResult.data,
      stat: dataResult.stat,
      acl,
    }
  }

  private async getNodeData(
    path: string,
  ): Promise<{ data: Buffer; stat: NodeSnapshot['stat'] }> {
    return new Promise<{ data: Buffer; stat: NodeSnapshot['stat'] }>((resolve, reject) => {
      this.requireClient().getData(path, (error, data, stat) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve({
          data: data ?? Buffer.alloc(0),
          stat: {
            version: stat?.version ?? 0,
            numChildren: stat?.numChildren ?? 0,
            mtime: normalizeStatTimestamp(stat?.mtime),
            dataLength: stat?.dataLength ?? (data?.length ?? 0),
          },
        })
      })
    })
  }

  async search(query: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.requireClient().listSubTreeBFS('/', (error, paths = []) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve(paths.filter((path) => path.includes(query)))
      })
    })
  }

  async createNode(path: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requireClient().create(path, data, (error) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve()
      })
    })
  }

  async updateNode(path: string, data: Buffer, version?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requireClient().setData(path, data, version ?? -1, (error) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve()
      })
    })
  }

  async deleteNode(
    path: string,
    options?: { version?: number; recursive?: boolean },
  ): Promise<void> {
    if (options?.recursive) {
      await this.deleteSubtree(path)
      return
    }

    return new Promise((resolve, reject) => {
      this.requireClient().remove(path, options?.version ?? -1, (error) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve()
      })
    })
  }

  async setAcl(path: string, acl: AclEntry[]): Promise<void> {
    const module = this.factory()
    const encoded = acl.map(
      (entry) =>
        new module.ACL(
          encodePermissions(entry.permissions, module.Permission),
          new module.Id(entry.scheme, entry.id),
        ),
    )

    return new Promise((resolve, reject) => {
      this.requireClient().setACL(path, encoded, -1, (error) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve()
      })
    })
  }

  private requireClient(): NodeZkClientInstance {
    if (!this.client) {
      throw new Error('ZooKeeper client is not connected')
    }

    return this.client
  }

  private attachConnectionLossHandlers(client: NodeZkClientInstance | null): void {
    if (!client || this.releaseConnectionLossHandlers || !client.on) {
      return
    }

    const handleDisconnected = () => {
      this.notifyConnectionLoss(client)
    }

    client.on('disconnected', handleDisconnected)
    client.on('expired', handleDisconnected)
    client.on('authenticationFailed', handleDisconnected)

    this.releaseConnectionLossHandlers = () => {
      client.removeListener?.('disconnected', handleDisconnected)
      client.removeListener?.('expired', handleDisconnected)
      client.removeListener?.('authenticationFailed', handleDisconnected)
    }
  }

  private notifyConnectionLoss(client: NodeZkClientInstance): void {
    if (
      this.client !== client ||
      this.connectionLossNotified ||
      this.connectionLossSubscribers.size === 0
    ) {
      return
    }

    this.connectionLossNotified = true
    for (const subscriber of this.connectionLossSubscribers) {
      subscriber()
    }
  }

  private async deleteSubtree(path: string): Promise<void> {
    const paths = await new Promise<string[]>((resolve, reject) => {
      this.requireClient().listSubTreeBFS(path, (error, nextPaths = []) => {
        if (error) {
          reject(this.toAppError(error))
          return
        }

        resolve(nextPaths)
      })
    })

    const pathsToDelete = Array.from(new Set([...paths, path]))
      .sort((left, right) => right.length - left.length)

    for (const currentPath of pathsToDelete) {
      await new Promise<void>((resolve, reject) => {
        this.requireClient().remove(currentPath, -1, (error) => {
          if (error) {
            reject(this.toAppError(error))
            return
          }

          resolve()
        })
      })
    }
  }

  private toAppError(
    error: unknown,
    fallbackMessage?: string,
  ): Error & { code: AppErrorCode } {
    const code = mapZooKeeperError(error, this.factory().Exception)
    const appError = new Error(
      getErrorMessage(error, fallbackMessage ?? defaultMessageForCode(code)),
      {
        cause: error,
      },
    ) as Error & {
      code: AppErrorCode
    }
    appError.code = code
    return appError
  }
}

function buildConnectionString(connection: ConnectionConfig): string {
  if (!connection.chroot) {
    return connection.hosts
  }

  return `${connection.hosts}${connection.chroot}`
}

function decodeAcl(entry: NodeZkAclRecord): AclEntry {
  const module = loadNodeZkModule()
  const permissionMask = entry.permission ?? entry.perms ?? 0

  return {
    scheme: entry.id.scheme,
    id: entry.id.id,
    permissions: PERMISSIONS.flatMap(([name, key]) =>
      (permissionMask & module.Permission[key]) !== 0 ? [name] : [],
    ),
  }
}

function encodePermissions(
  permissions: AclEntry['permissions'],
  availablePermissions: Record<string, number>,
): number {
  return permissions.reduce((sum, permission) => {
    const key = permission.toUpperCase()
    return sum + (availablePermissions[key] ?? 0)
  }, 0)
}

function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage ?? 'ZooKeeper operation failed'
}

function defaultMessageForCode(code: AppErrorCode): string {
  switch (code) {
    case 'NODE_NOT_EMPTY':
      return 'This node contains child nodes and cannot be deleted directly.'
    case 'NODE_NOT_FOUND':
      return 'The requested node could not be found.'
    case 'NODE_ALREADY_EXISTS':
      return 'A node with the same path already exists.'
    case 'BAD_VERSION':
      return 'The node version changed before this action completed.'
    case 'CONNECTION_LOST':
      return 'The ZooKeeper connection was lost during the request.'
    case 'CONNECTION_TIMEOUT':
      return 'The ZooKeeper connection timed out.'
    case 'ACL_INVALID':
      return 'The ACL payload is invalid.'
    case 'UNKNOWN_FAILURE':
      return 'ZooKeeper operation failed'
  }
}

function joinChildPath(parentPath: string, childName: string): string {
  return parentPath === '/' ? `/${childName}` : `${parentPath}/${childName}`
}

function createAppError(
  code: AppErrorCode,
  message: string,
  cause?: unknown,
): Error & { code: AppErrorCode } {
  const appError = new Error(message, { cause }) as Error & {
    code: AppErrorCode
  }
  appError.code = code
  return appError
}

function normalizeStatTimestamp(
  value: number | null | undefined | Buffer | Uint8Array,
): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (!value) {
    return null
  }

  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  if (buffer.length < 8) {
    return null
  }

  const decoded = Number(buffer.readBigInt64BE(0))
  return Number.isFinite(decoded) ? decoded : null
}
