import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { ConnectionService } from '../../src/domain/connections/connection-service'
import { ConnectionRepository } from '../../src/infrastructure/storage/connection-repository'
import { SecretStore } from '../../src/infrastructure/security/secret-store'
import type { StoredConnection } from '../../src/shared/models/connection'

const electronState = vi.hoisted(() => ({
  encryptionAvailable: true,
}))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => electronState.encryptionAvailable,
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

  async delete(key: string) {
    this.values.delete(key)
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

  it('clears an existing secret when authSecret is explicitly removed', async () => {
    const repo = new MemoryRepository()
    const secretStore = new MemorySecretStore()
    const service = new ConnectionService(repo as never, secretStore as never)

    await service.save({
      id: 'local',
      name: 'Local ZK',
      hosts: '127.0.0.1:2181',
      authSecret: 'digest-user:pwd',
    })

    await service.save({
      id: 'local',
      name: 'Local ZK',
      hosts: '127.0.0.1:2181',
      authSecret: '',
    })

    expect(await secretStore.get('connection:local:auth')).toBeNull()
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

  it('does not persist plaintext secrets on disk when encryption is available', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-secret-store-'))
    const filePath = path.join(tempDir, 'secrets.json')
    const store = new SecretStore(filePath)

    await store.set('connection:local:auth', 'digest-user:pwd')

    const raw = await fs.readFile(filePath, 'utf8')

    expect(raw).not.toContain('digest-user:pwd')
    expect(raw).toContain('ZW5jOmRpZ2VzdC11c2VyOnB3ZA==')
  })

  it('fails closed when encryption is unavailable', async () => {
    electronState.encryptionAvailable = false
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-secret-store-'))
    const filePath = path.join(tempDir, 'secrets.json')
    const store = new SecretStore(filePath)

    await expect(
      store.set('connection:local:auth', 'digest-user:pwd'),
    ).rejects.toThrow(/encryption/i)

    await expect(fs.readFile(filePath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    electronState.encryptionAvailable = true
  })

  it('throws when the persisted secret file is malformed', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-secret-store-'))
    const filePath = path.join(tempDir, 'secrets.json')
    const store = new SecretStore(filePath)

    await fs.writeFile(filePath, '{not-json', 'utf8')

    await expect(store.get('connection:local:auth')).rejects.toThrow()
  })
})

describe('ConnectionRepository', () => {
  it('throws when the persisted repository file is malformed', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-connection-repo-'))
    const filePath = path.join(tempDir, 'connections.json')
    const repo = new ConnectionRepository(filePath)

    await fs.writeFile(filePath, '{not-json', 'utf8')

    await expect(repo.list()).rejects.toThrow()
  })
})
