import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
} from 'electron'

import { ConnectionService } from '../../../src/domain/connections/connection-service'
import { SessionManager } from '../../../src/domain/zookeeper/session-manager'
import { SecretStore } from '../../../src/infrastructure/security/secret-store'
import { ConnectionRepository } from '../../../src/infrastructure/storage/connection-repository'
import { NodeMarkRepository } from '../../../src/infrastructure/storage/node-mark-repository'
import { PreferencesRepository } from '../../../src/infrastructure/storage/preferences-repository'
import { NodeZkClient } from '../../../src/infrastructure/zookeeper/node-zk-client'
import { channels } from '../../../src/shared/ipc'
import type { StoredConnection } from '../../../src/shared/models/connection'
import type { RuntimeEvent } from '../../../src/shared/models/node'
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LANGUAGE,
  type Preferences,
  type Theme,
} from '../../../src/shared/models/preferences'
import { createOrFocusSettingsWindow } from '../window'

export function registerHandlers(userDataPath: string): void {
  const repository = new ConnectionRepository(
    path.join(userDataPath, 'connections.json'),
  )
  const secretStore = new SecretStore(
    path.join(userDataPath, 'secrets', 'connection-secrets.json'),
  )
  const preferencesRepository = new PreferencesRepository(
    path.join(userDataPath, 'preferences.json'),
  )
  const nodeMarkRepository = new NodeMarkRepository(
    path.join(userDataPath, 'node-marks.json'),
  )
  const connectionService = new ConnectionService(repository, secretStore)

  let activeConnection: (StoredConnection & { authSecret?: string }) | null = null
  let sessionManager = new SessionManager(() => {
    if (!activeConnection) {
      throw new Error('No connection selected')
    }

    return new NodeZkClient(activeConnection)
  })

  const sendEventToAllWindows = <TPayload,>(
    channel: string,
    payload: TPayload,
  ) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(channel, payload)
    }
  }

  const sendRuntimeEvent = (event: RuntimeEvent) => {
    sendEventToAllWindows(channels.runtimeEvent, event)
  }

  const handleSessionRuntimeEvent = (event: RuntimeEvent) => {
    if (
      event.type === 'connectionStateChanged' &&
      event.state === 'disconnected'
    ) {
      activeConnection = null
    }

    sendRuntimeEvent(event)
  }

  const resolvePreferences = async (): Promise<Preferences> => {
    const savedPreferences = await preferencesRepository.getPreferences()
    const fallbackTheme: Theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

    return {
      theme: savedPreferences.theme ?? fallbackTheme,
      language: savedPreferences.language ?? DEFAULT_LANGUAGE,
      fontSize: savedPreferences.fontSize ?? DEFAULT_FONT_SIZE,
    }
  }

  let stopRuntimeEvents = sessionManager.subscribe(handleSessionRuntimeEvent)

  ipcMain.handle(channels.connectionList, () => connectionService.list())
  ipcMain.handle(channels.connectionSave, (_event, draft) =>
    connectionService.save(draft),
  )
  ipcMain.handle(channels.connectionDelete, async (_event, payload) => {
    if (activeConnection?.id === payload.connectionId) {
      throw new Error('Disconnect the active connection before deleting it.')
    }

    await connectionService.delete(payload.connectionId)
    await nodeMarkRepository.clearConnection(payload.connectionId)
  })
  ipcMain.handle(channels.connectionExport, () => connectionService.exportAll())
  ipcMain.handle(channels.connectionImport, (_event, payload) =>
    connectionService.importJson(payload.json),
  )
  ipcMain.handle(channels.connectionExportToFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Export ZKube connections',
      buttonLabel: 'Select folder',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const exportPath = path.join(result.filePaths[0], 'zkube-connections.json')
    await writeFile(exportPath, await connectionService.exportAll(), 'utf8')

    return {
      filePath: exportPath,
    }
  })
  ipcMain.handle(channels.connectionImportFromFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import ZKube connections',
      buttonLabel: 'Import JSON',
      filters: [
        {
          name: 'JSON files',
          extensions: ['json'],
        },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const json = await readFile(result.filePaths[0], 'utf8')
    return connectionService.importJson(json)
  })
  ipcMain.handle(channels.connectionConnect, async (_event, payload) => {
    const hadActiveConnection = activeConnection !== null
    const connection = await findConnection(connectionService, payload.connectionId)
    const authSecret = await connectionService.getSecret(payload.connectionId)
    const nextConnection = {
      ...connection,
      authSecret: authSecret ?? undefined,
    }
    const nextSessionManager = new SessionManager(() => new NodeZkClient(nextConnection))

    try {
      await nextSessionManager.connect(payload.connectionId)
    } catch (error) {
      await nextSessionManager.disconnect()
      throw error
    }

    const previousSessionManager = sessionManager
    const stopPreviousRuntimeEvents = stopRuntimeEvents

    if (hadActiveConnection) {
      sendRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'reconnecting',
      })
    }

    stopPreviousRuntimeEvents()
    await previousSessionManager.disconnect()

    activeConnection = nextConnection
    sessionManager = nextSessionManager
    stopRuntimeEvents = nextSessionManager.subscribe(handleSessionRuntimeEvent)
    sendRuntimeEvent({
      type: 'connectionStateChanged',
      state: 'connected',
    })
  })
  ipcMain.handle(channels.preferencesGetTheme, async () => resolvePreferences())
  ipcMain.handle(channels.preferencesSetTheme, async (_event, payload) => {
    const current = await resolvePreferences()
    const nextPreferences: Preferences = {
      theme: payload.theme ?? current.theme,
      language: payload.language ?? current.language,
      fontSize: payload.fontSize ?? current.fontSize,
    }

    await preferencesRepository.savePreferences(nextPreferences)
    sendEventToAllWindows(channels.preferencesThemeChanged, nextPreferences)

    return nextPreferences
  })
  ipcMain.handle(channels.preferencesOpenSettings, async () => {
    await createOrFocusSettingsWindow()
  })
  ipcMain.handle(channels.nodeMarksList, (_event, payload) =>
    nodeMarkRepository.list(payload.connectionId),
  )
  ipcMain.handle(channels.nodeMarksSet, async (_event, payload) => {
    await nodeMarkRepository.set(payload.connectionId, payload.path, payload.color)
  })
  ipcMain.handle(channels.nodeMarksClear, async (_event, payload) => {
    await nodeMarkRepository.clear(
      payload.connectionId,
      payload.path,
      payload.recursive ?? false,
    )
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
  ipcMain.handle(channels.zookeeperDelete, async (_event, payload) => {
    await sessionManager.delete(payload.path, {
      version: payload.version,
      recursive: payload.recursive,
    })

    if (activeConnection) {
      await nodeMarkRepository.clear(activeConnection.id, payload.path, true)
    }
  })
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
