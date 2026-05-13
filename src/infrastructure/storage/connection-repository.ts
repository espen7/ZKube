import fs from 'node:fs/promises'
import path from 'node:path'

import type { StoredConnection } from '../../shared/models/connection'

export class ConnectionRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<StoredConnection[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as StoredConnection[]
    } catch {
      return []
    }
  }

  async save(items: StoredConnection[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8')
  }
}
