import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { safeStorage } from 'electron'

type PersistedSecrets = Record<
  string,
  {
    encrypted: boolean
    value: string
  }
>

export class SecretStore {
  constructor(
    private readonly filePath = path.join(
      os.homedir(),
      '.zkube',
      'connection-secrets.json',
    ),
  ) {}

  async set(key: string, value: string): Promise<void> {
    const values = await this.readAll()
    values[key] = this.protect(value)
    await this.writeAll(values)
  }

  async get(key: string): Promise<string | null> {
    const values = await this.readAll()
    const stored = values[key]
    if (!stored) {
      return null
    }

    if (!stored.encrypted) {
      return stored.value
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    return safeStorage.decryptString(Buffer.from(stored.value, 'base64'))
  }

  private protect(value: string): PersistedSecrets[string] {
    if (!safeStorage.isEncryptionAvailable()) {
      return { encrypted: false, value }
    }

    return {
      encrypted: true,
      value: safeStorage.encryptString(value).toString('base64'),
    }
  }

  private async readAll(): Promise<PersistedSecrets> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as PersistedSecrets
    } catch {
      return {}
    }
  }

  private async writeAll(values: PersistedSecrets): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(values, null, 2), 'utf8')
  }
}
