import type { AclEntry, NodeSnapshot, RuntimeEvent } from '../../shared/models/node'
import type { ZooKeeperClient } from './client'

export class SessionManager {
  private client: ZooKeeperClient | null = null
  private childrenCache = new Map<string, string[]>()
  private listeners = new Set<(event: RuntimeEvent) => void>()

  constructor(private readonly createClient: () => ZooKeeperClient) {}

  async connect(_connectionId: string): Promise<void> {
    this.client = this.createClient()
    await this.client.connect()
    this.emit({ type: 'connectionStateChanged', state: 'connected' })
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return
    }

    await this.client.close()
    this.client = null
    this.childrenCache.clear()
    this.emit({ type: 'connectionStateChanged', state: 'disconnected' })
  }

  async loadChildren(path: string): Promise<string[]> {
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

  async search(query: string): Promise<string[]> {
    return this.requireClient().search(query)
  }

  async create(path: string, data: Buffer): Promise<void> {
    const parent = parentPath(path)
    await this.requireClient().createNode(path, data)
    this.childrenCache.delete(parent)
    this.emit({ type: 'nodeChildrenChanged', path: parent })
  }

  async delete(path: string, version?: number): Promise<void> {
    const parent = parentPath(path)
    await this.requireClient().deleteNode(path, version)
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

  subscribe(cb: (event: RuntimeEvent) => void): () => boolean {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  emit(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  async openNode(path: string): Promise<NodeSnapshot> {
    return this.open(path)
  }

  async createNode(path: string, data: Buffer): Promise<void> {
    await this.create(path, data)
  }

  async deleteNode(path: string, version?: number): Promise<void> {
    await this.delete(path, version)
  }

  async updateNode(path: string, data: Buffer, version?: number): Promise<void> {
    await this.update(path, data, version)
  }

  private requireClient(): ZooKeeperClient {
    if (!this.client) {
      throw new Error('No active ZooKeeper session')
    }

    return this.client
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
