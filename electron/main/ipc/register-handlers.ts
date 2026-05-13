import path from 'node:path'

import { BrowserWindow, ipcMain } from 'electron'

import { ConnectionService } from '../../../src/domain/connections/connection-service'
import { SessionManager } from '../../../src/domain/zookeeper/session-manager'
import { NodeZkClient } from '../../../src/infrastructure/zookeeper/node-zk-client'
import { SecretStore } from '../../../src/infrastructure/security/secret-store'
import { ConnectionRepository } from '../../../src/infrastructure/storage/connection-repository'
import { channels } from '../../../src/shared/ipc'
import type { StoredConnection } from '../../../src/shared/models/connection'

export function registerHandlers(userDataPath: string): void {
  const repository = new ConnectionRepository(
    path.join(userDataPath, 'connections.json'),
  )
  const secretStore = new SecretStore(
    path.join(userDataPath, 'secrets', 'connection-secrets.json'),
  )
  const connectionService = new ConnectionService(repository, secretStore)

  let activeConnection: (StoredConnection & { authSecret?: string }) | null = null
  let sessionManager = new SessionManager(() => {
    if (!activeConnection) {
      throw new Error('No connection selected')
    }

    return new NodeZkClient(activeConnection)
  })

  let stopRuntimeEvents = sessionManager.subscribe((event) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(channels.runtimeEvent, event)
    }
  })

  ipcMain.handle(channels.connectionList, () => connectionService.list())
  ipcMain.handle(channels.connectionSave, (_event, draft) =>
    connectionService.save(draft),
  )
  ipcMain.handle(channels.connectionExport, () => connectionService.exportAll())
  ipcMain.handle(channels.connectionImport, (_event, payload) =>
    connectionService.importJson(payload.json),
  )
  ipcMain.handle(channels.connectionConnect, async (_event, payload) => {
    const connection = await findConnection(connectionService, payload.connectionId)
    const authSecret = await connectionService.getSecret(payload.connectionId)
    const nextConnection = {
      ...connection,
      authSecret: authSecret ?? undefined,
    }
    const nextSessionManager = new SessionManager(
      () => new NodeZkClient(nextConnection),
    )
    const stopNextRuntimeEvents = nextSessionManager.subscribe((event) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(channels.runtimeEvent, event)
      }
    })

    try {
      await nextSessionManager.connect(payload.connectionId)
    } catch (error) {
      stopNextRuntimeEvents()
      await nextSessionManager.disconnect()
      throw error
    }

    const previousSessionManager = sessionManager
    const stopPreviousRuntimeEvents = stopRuntimeEvents

    activeConnection = nextConnection
    sessionManager = nextSessionManager
    stopRuntimeEvents = stopNextRuntimeEvents
    stopPreviousRuntimeEvents()
    await previousSessionManager.disconnect()
  })

  ipcMain.handle(channels.zookeeperDisconnect, async () => {
    await sessionManager.disconnect()
    activeConnection = null
  })
  ipcMain.handle(channels.zookeeperLoadChildren, (_event, payload) =>
    sessionManager.loadChildren(payload.path),
  )
  ipcMain.handle(channels.zookeeperOpen, (_event, payload) =>
    sessionManager.open(payload.path),
  )
  ipcMain.handle(channels.zookeeperSearch, (_event, payload) =>
    sessionManager.search(payload.query),
  )
  ipcMain.handle(channels.zookeeperCreate, (_event, payload) =>
    sessionManager.create(payload.path, Buffer.from(payload.data)),
  )
  ipcMain.handle(channels.zookeeperDelete, (_event, payload) =>
    sessionManager.delete(payload.path, payload.version),
  )
  ipcMain.handle(channels.zookeeperUpdate, (_event, payload) =>
    sessionManager.update(payload.path, Buffer.from(payload.data), payload.version),
  )
  ipcMain.handle(channels.zookeeperSaveAcl, (_event, payload) =>
    sessionManager.saveAcl(payload.path, payload.acl),
  )
}

async function findConnection(
  connectionService: ConnectionService,
  connectionId: string,
): Promise<StoredConnection> {
  const connection = (await connectionService.list()).find(
    (item) => item.id === connectionId,
  )

  if (!connection) {
    throw new Error(`Connection "${connectionId}" was not found`)
  }

  return connection
}
