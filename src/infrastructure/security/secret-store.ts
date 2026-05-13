import { safeStorage } from 'electron'

export class SecretStore {
  private readonly values = new Map<string, string>()

  async set(key: string, value: string): Promise<void> {
    const encrypted = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(value).toString('base64')
      : value
    this.values.set(key, encrypted)
  }

  async get(key: string): Promise<string | null> {
    const encrypted = this.values.get(key)
    if (!encrypted) {
      return null
    }

    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      : encrypted
  }
}
