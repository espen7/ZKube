import { describe, expect, it } from 'vitest'

import { SessionManager } from '../../src/domain/zookeeper/session-manager'

class FakeClient {
  children = new Map([['/', ['app', 'config']]])
  getChildrenCalls = new Map<string, number>()
  searchResults = ['/app', '/config']
  createNodeCalls: Array<{ path: string; data: Buffer }> = []
  updateNodeCalls: Array<{ path: string; data: Buffer; version?: number }> = []
  deleteNodeCalls: Array<{ path: string; version?: number }> = []
  aclCalls: Array<{ path: string; acl: Array<{ scheme: string; id: string; permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'> }> }> = []

  async connect() {}

  async close() {}

  async getChildren(path: string) {
    this.getChildrenCalls.set(path, (this.getChildrenCalls.get(path) ?? 0) + 1)
    return this.children.get(path) ?? []
  }

  async getNode(path: string) {
    return {
      path,
      data: Buffer.from(`data:${path}`),
      stat: { version: 1, numChildren: 0 },
      acl: [],
    }
  }

  async search(_query: string) {
    return this.searchResults
  }

  async createNode(path: string, data: Buffer) {
    this.createNodeCalls.push({ path, data })
  }

  async updateNode(path: string, data: Buffer, version?: number) {
    this.updateNodeCalls.push({ path, data, version })
  }

  async deleteNode(path: string, version?: number) {
    this.deleteNodeCalls.push({ path, version })
  }

  async setAcl(
    path: string,
    acl: Array<{
      scheme: string
      id: string
      permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'>
    }>,
  ) {
    this.aclCalls.push({ path, acl })
  }
}

describe('SessionManager', () => {
  it('loads tree children lazily and caches the result', async () => {
    const client = new FakeClient()
    const manager = new SessionManager(() => client as never)
    await manager.connect('local')

    const first = await manager.loadChildren('/')
    const second = await manager.loadChildren('/')

    expect(first).toEqual(['app', 'config'])
    expect(second).toEqual(first)
    expect(client.getChildrenCalls.get('/')).toBe(1)
  })

  it('opens nodes and delegates search to the active client', async () => {
    const manager = new SessionManager(() => new FakeClient() as never)
    await manager.connect('local')

    await expect(manager.open('/app')).resolves.toMatchObject({
      path: '/app',
      stat: { version: 1, numChildren: 0 },
    })
    await expect(manager.search('app')).resolves.toEqual(['/app', '/config'])
  })

  it('supports the requested mutation API names and emits focused runtime events', async () => {
    const client = new FakeClient()
    const manager = new SessionManager(() => client as never)
    const events: Array<{ type: string; path?: string; state?: string }> = []
    manager.subscribe((event) => {
      events.push(event)
    })

    await manager.connect('local')
    await manager.loadChildren('/')
    await manager.create('/service', Buffer.from('new'))
    await manager.loadChildren('/')
    await manager.update('/service', Buffer.from('updated'), 3)
    await manager.saveAcl('/service', [
      { scheme: 'world', id: 'anyone', permissions: ['read'] },
    ])
    await manager.delete('/service', 4)
    await manager.disconnect()

    expect(client.getChildrenCalls.get('/')).toBe(2)
    expect(client.createNodeCalls).toEqual([
      { path: '/service', data: Buffer.from('new') },
    ])
    expect(client.updateNodeCalls).toEqual([
      { path: '/service', data: Buffer.from('updated'), version: 3 },
    ])
    expect(client.deleteNodeCalls).toEqual([
      { path: '/service', version: 4 },
    ])
    expect(client.aclCalls).toEqual([
      {
        path: '/service',
        acl: [{ scheme: 'world', id: 'anyone', permissions: ['read'] }],
      },
    ])
    expect(events).toEqual([
      { type: 'connectionStateChanged', state: 'connected' },
      { type: 'nodeChildrenChanged', path: '/' },
      { type: 'nodeDataChanged', path: '/service' },
      { type: 'nodeDataChanged', path: '/service' },
      { type: 'nodeDeleted', path: '/service' },
      { type: 'nodeChildrenChanged', path: '/' },
      { type: 'connectionStateChanged', state: 'disconnected' },
    ])
  })

  it('exposes a public emit method for runtime events', async () => {
    const manager = new SessionManager(() => new FakeClient() as never)
    const events: Array<{ type: string; state?: string }> = []
    manager.subscribe((event) => {
      events.push(event)
    })

    manager.emit({ type: 'connectionStateChanged', state: 'reconnecting' })

    expect(events).toEqual([
      { type: 'connectionStateChanged', state: 'reconnecting' },
    ])
  })
})
