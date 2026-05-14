import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { Preferences } from '../../shared/models/preferences'

type PersistedPreferences = Partial<Preferences>

export class PreferencesRepository {
  constructor(private readonly filePath: string) {}

  async getPreferences(): Promise<PersistedPreferences> {
    return this.readAll()
  }

  async savePreferences(preferences: Preferences): Promise<void> {
    const current = await this.readAll()
    await this.writeAll({
      ...current,
      ...preferences,
    })
  }

  private async readAll(): Promise<PersistedPreferences> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as PersistedPreferences
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return {}
      }

      throw error
    }
  }

  private async writeAll(values: PersistedPreferences): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(values, null, 2), 'utf8')
    await fs.rename(tempPath, this.filePath)
  }
}
