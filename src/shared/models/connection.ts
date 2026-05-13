export type ConnectionDraft = {
  id: string
  name: string
  hosts: string
  chroot?: string
  sessionTimeoutMs?: number
  authSecret?: string
}

export type StoredConnection = Omit<ConnectionDraft, 'authSecret'> & {
  createdAt: string
  updatedAt: string
}
