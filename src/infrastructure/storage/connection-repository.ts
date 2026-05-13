import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { StoredConnection } from '../../shared/models/connection'

export class ConnectionRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<StoredConnection[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as StoredConnection[]
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return []
      }

      throw error
    }
  }

  async save(items: StoredConnection[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8')
    await fs.rename(tempPath, this.filePath)
  }
}
