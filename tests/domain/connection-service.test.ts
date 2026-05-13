import { describe, expect, it } from 'vitest'

import { ConnectionService } from '../../src/domain/connections/connection-service'
import type { StoredConnection } from '../../src/shared/models/connection'

class MemoryRepository {
  data: StoredConnection[] = []

  async list() {
    return this.data
  }

  async save(next: StoredConnection[]) {
    this.data = next
  }
}

class MemorySecretStore {
  values = new Map<string, string>()

  async set(key: string, value: string) {
    this.values.set(key, value)
  }

  async get(key: string) {
    return this.values.get(key) ?? null
  }
}

describe('ConnectionService', () => {
  it('stores secret material outside the JSON connection list', async () => {
    const repo = new MemoryRepository()
    const secretStore = new MemorySecretStore()
    const service = new ConnectionService(repo as never, secretStore as never)

    await service.save({
      id: 'local',
      name: 'Local ZK',
      hosts: '127.0.0.1:2181',
      authSecret: 'digest-user:pwd',
    })

    expect(repo.data[0]).not.toHaveProperty('authSecret')
    expect(await secretStore.get('connection:local:auth')).toBe('digest-user:pwd')
  })
})
