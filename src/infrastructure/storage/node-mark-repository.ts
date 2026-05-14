import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { NodeMarkColor } from '../../shared/models/node'

type PersistedMarks = Record<string, Record<string, NodeMarkColor>>

export class NodeMarkRepository {
  constructor(private readonly filePath: string) {}

  async list(connectionId: string): Promise<Record<string, NodeMarkColor>> {
    const all = await this.readAll()
    return { ...(all[connectionId] ?? {}) }
  }

  async set(
    connectionId: string,
    nodePath: string,
    color: NodeMarkColor,
  ): Promise<void> {
    const all = await this.readAll()
    await this.writeAll({
      ...all,
      [connectionId]: {
        ...(all[connectionId] ?? {}),
        [nodePath]: color,
      },
    })
  }

  async clear(
    connectionId: string,
    nodePath: string,
    includeDescendants = false,
  ): Promise<void> {
    const all = await this.readAll()
    const nextConnectionMarks = Object.fromEntries(
      Object.entries(all[connectionId] ?? {}).filter(([candidatePath]) => {
        if (includeDescendants) {
          return !isSameOrDescendantPath(candidatePath, nodePath)
        }

        return candidatePath !== nodePath
      }),
    )

    if (Object.keys(nextConnectionMarks).length === 0) {
      const { [connectionId]: _removed, ...rest } = all
      await this.writeAll(rest)
      return
    }

    await this.writeAll({
      ...all,
      [connectionId]: nextConnectionMarks,
    })
  }

  async clearConnection(connectionId: string): Promise<void> {
    const all = await this.readAll()
    if (!(connectionId in all)) {
      return
    }

    const { [connectionId]: _removed, ...rest } = all
    await this.writeAll(rest)
  }

  private async readAll(): Promise<PersistedMarks> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as PersistedMarks
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

  private async writeAll(values: PersistedMarks): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(values, null, 2), 'utf8')
    await fs.rename(tempPath, this.filePath)
  }
}

function isSameOrDescendantPath(candidatePath: string, targetPath: string) {
  if (candidatePath === targetPath) {
    return true
  }

  if (targetPath === '/') {
    return candidatePath.startsWith('/')
  }

  return candidatePath.startsWith(`${targetPath}/`)
}
