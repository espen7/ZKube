import type {
  ConnectionDraft,
  StoredConnection,
} from '../../shared/models/connection'

type Repo = {
  list(): Promise<StoredConnection[]>
  save(items: StoredConnection[]): Promise<void>
}

type Secrets = {
  set(key: string, value: string): Promise<void>
  get(key: string): Promise<string | null>
}

export class ConnectionService {
  constructor(
    private readonly repo: Repo,
    private readonly secrets: Secrets,
  ) {}

  async save(input: ConnectionDraft): Promise<StoredConnection> {
    const now = new Date().toISOString()
    const all = await this.repo.list()
    const existing = all.find((item) => item.id === input.id)
    const next: StoredConnection = {
      id: input.id,
      name: input.name,
      hosts: input.hosts,
      chroot: input.chroot,
      sessionTimeoutMs: input.sessionTimeoutMs ?? 30_000,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    const merged = [...all.filter((item) => item.id !== input.id), next]
    await this.repo.save(merged)

    if (input.authSecret) {
      await this.secrets.set(`connection:${input.id}:auth`, input.authSecret)
    }

    return next
  }

  async list(): Promise<StoredConnection[]> {
    return this.repo.list()
  }

  async getSecret(connectionId: string): Promise<string | null> {
    return this.secrets.get(`connection:${connectionId}:auth`)
  }

  async exportAll(): Promise<string> {
    const items = await this.repo.list()
    return JSON.stringify(items, null, 2)
  }

  async importJson(raw: string): Promise<StoredConnection[]> {
    const parsed = JSON.parse(raw) as ConnectionDraft[]
    for (const item of parsed) {
      await this.save(item)
    }

    return this.list()
  }
}
