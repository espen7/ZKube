import type {
  AclEntry,
  NodeSnapshot,
  RuntimeEvent,
  TreeNodeRow,
  ZooKeeperOverview,
} from '../../shared/models/node'
import type { ZooKeeperClient } from './client'

export class SessionManager {
  private client: ZooKeeperClient | null = null
  private childrenCache = new Map<string, TreeNodeRow[]>()
  private listeners = new Set<(event: RuntimeEvent) => void>()
  private stopConnectionLossWatch: (() => void) | null = null
  private disconnecting = false

  constructor(private readonly createClient: () => ZooKeeperClient) {}

  async connect(_connectionId: string): Promise<void> {
    this.disconnecting = false
    this.client = this.createClient()
    await this.client.connect()
    this.stopConnectionLossWatch?.()
    this.stopConnectionLossWatch = this.client.watchConnectionLoss(() => {
      this.handleConnectionLoss()
    })
    this.emit({ type: 'connectionStateChanged', state: 'connected' })
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return
    }

    this.disconnecting = true
    const currentClient = this.client
    this.stopConnectionLossWatch?.()
    this.stopConnectionLossWatch = null

    try {
      await currentClient.close()
    } finally {
      this.client = null
      this.childrenCache.clear()
      this.disconnecting = false
      this.emit({ type: 'connectionStateChanged', state: 'disconnected' })
    }
  }

  async loadChildren(path: string): Promise<TreeNodeRow[]> {
    if (this.childrenCache.has(path)) {
      return this.childrenCache.get(path)!
    }

    const children = await this.requireClient().getChildren(path)
    this.childrenCache.set(path, children)
    return children
  }

  async open(path: string): Promise<NodeSnapshot> {
    return this.requireClient().getNode(path)
  }

  async getOverview(): Promise<ZooKeeperOverview> {
    return this.requireClient().getOverview()
  }

  async search(query: string): Promise<string[]> {
    return this.requireClient().search(query)
  }

  async create(path: string, data: Buffer): Promise<void> {
    const parent = parentPath(path)
    await this.requireClient().createNode(path, data)
    this.childrenCache.delete(parent)
    this.emit({ type: 'nodeChildrenChanged', path: parent })
  }

  async delete(
    path: string,
    options?: { version?: number; recursive?: boolean },
  ): Promise<void> {
    const parent = parentPath(path)
    await this.requireClient().deleteNode(path, options)
    this.invalidateDeletedPath(path)
    this.childrenCache.delete(parent)
    this.emit({ type: 'nodeDeleted', path })
    this.emit({ type: 'nodeChildrenChanged', path: parent })
  }

  async update(path: string, data: Buffer, version?: number): Promise<void> {
    await this.requireClient().updateNode(path, data, version)
    this.emit({ type: 'nodeDataChanged', path })
  }

  async saveAcl(path: string, acl: AclEntry[]): Promise<void> {
    await this.requireClient().setAcl(path, acl)
    this.emit({ type: 'nodeDataChanged', path })
  }

  subscribe(cb: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  emit(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private invalidateDeletedPath(path: string): void {
    const subtreePrefix = path === '/' ? '/' : `${path}/`

    for (const cachedPath of this.childrenCache.keys()) {
      if (cachedPath === path || cachedPath.startsWith(subtreePrefix)) {
        this.childrenCache.delete(cachedPath)
      }
    }
  }

  private requireClient(): ZooKeeperClient {
    if (!this.client) {
      throw new Error('No active ZooKeeper session')
    }

    return this.client
  }

  private handleConnectionLoss(): void {
    if (!this.client || this.disconnecting) {
      return
    }

    const currentClient = this.client
    this.client = null
    this.childrenCache.clear()
    this.stopConnectionLossWatch?.()
    this.stopConnectionLossWatch = null
    void currentClient.close().catch(() => {})
    this.emit({ type: 'connectionStateChanged', state: 'disconnected' })
  }
}

function parentPath(path: string): string {
  if (path === '/') {
    return '/'
  }

  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) {
    return '/'
  }

  return `/${parts.slice(0, -1).join('/')}`
}
