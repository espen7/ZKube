import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
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
    this.assertEncryptionAvailable()
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

    this.assertEncryptionAvailable()
    return safeStorage.decryptString(Buffer.from(stored.value, 'base64'))
  }

  async delete(key: string): Promise<void> {
    const values = await this.readAll()
    if (!(key in values)) {
      return
    }

    delete values[key]

    if (Object.keys(values).length === 0) {
      await this.deleteFileIfPresent()
      return
    }

    await this.writeAll(values)
  }

  private protect(value: string): PersistedSecrets[string] {
    return {
      encrypted: true,
      value: safeStorage.encryptString(value).toString('base64'),
    }
  }

  private async readAll(): Promise<PersistedSecrets> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as PersistedSecrets
    } catch (error) {
      if (this.isMissingFileError(error)) {
        return {}
      }

      throw error
    }
  }

  private async writeAll(values: PersistedSecrets): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(values, null, 2), 'utf8')
    await fs.rename(tempPath, this.filePath)
  }

  private async deleteFileIfPresent(): Promise<void> {
    try {
      await fs.rm(this.filePath)
    } catch (error) {
      if (!this.isMissingFileError(error)) {
        throw error
      }
    }
  }

  private assertEncryptionAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('SecretStore requires electron safeStorage encryption')
    }
  }

  private isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
  }
}
