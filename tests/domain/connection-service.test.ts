import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { ConnectionService } from '../../src/domain/connections/connection-service'
import { SecretStore } from '../../src/infrastructure/security/secret-store'
import type { StoredConnection } from '../../src/shared/models/connection'

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`enc:${value}`, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8').replace(/^enc:/, ''),
  },
}))

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

describe('SecretStore', () => {
  it('reads persisted secrets from disk in a new instance', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-secret-store-'))
    const filePath = path.join(tempDir, 'secrets.json')
    const first = new SecretStore(filePath)

    await first.set('connection:local:auth', 'digest-user:pwd')

    const second = new SecretStore(filePath)

    expect(await second.get('connection:local:auth')).toBe('digest-user:pwd')
  })
})
