import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Theme } from '../../src/shared/models/preferences'

const mocks = vi.hoisted(() => ({
  registeredHandlers: new Map<
    string,
    (...args: unknown[]) => Promise<unknown> | unknown
  >(),
  sendMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  readFileMock: vi.fn(),
  writeFileMock: vi.fn(),
  createOrFocusSettingsWindowMock: vi.fn().mockResolvedValue(undefined),
  connectionServiceInstances: [] as Array<{
    list: ReturnType<typeof vi.fn>
    getSecret: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    exportAll: ReturnType<typeof vi.fn>
    importJson: ReturnType<typeof vi.fn>
  }>,
  preferenceRepositoryInstances: [] as Array<{
    getPreferences: ReturnType<typeof vi.fn>
    savePreferences: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: mocks.sendMock,
        },
      },
    ]),
  },
  dialog: {
    showOpenDialog: mocks.showOpenDialogMock,
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => Promise<unknown> | unknown) => {
      mocks.registeredHandlers.set(channel, handler)
    }),
  },
  nativeTheme: {
    shouldUseDarkColors: true,
  },
}))

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: mocks.readFileMock,
    writeFile: mocks.writeFileMock,
  },
  readFile: mocks.readFileMock,
  writeFile: mocks.writeFileMock,
}))

vi.mock('../../src/domain/connections/connection-service', () => ({
  ConnectionService: class {
    list = vi.fn().mockResolvedValue([])
    getSecret = vi.fn().mockResolvedValue(null)
    save = vi.fn()
    delete = vi.fn()
    exportAll = vi.fn()
    importJson = vi.fn()

    constructor() {
      mocks.connectionServiceInstances.push(this)
    }
  },
}))

vi.mock('../../src/domain/zookeeper/session-manager', () => ({
  SessionManager: class {
    subscribe() {
      return vi.fn()
    }
    connect = vi.fn()
    disconnect = vi.fn()
    loadChildren = vi.fn()
    open = vi.fn()
    search = vi.fn()
    create = vi.fn()
    delete = vi.fn()
    update = vi.fn()
    saveAcl = vi.fn()
  },
}))

vi.mock('../../src/infrastructure/zookeeper/node-zk-client', () => ({
  NodeZkClient: class {},
}))

vi.mock('../../src/infrastructure/security/secret-store', () => ({
  SecretStore: class {},
}))

vi.mock('../../src/infrastructure/storage/connection-repository', () => ({
  ConnectionRepository: class {},
}))

vi.mock('../../src/infrastructure/storage/node-mark-repository', () => ({
  NodeMarkRepository: class {
    list = vi.fn().mockResolvedValue({})
    set = vi.fn()
    clear = vi.fn()
    clearConnection = vi.fn()
  },
}))

vi.mock('../../src/infrastructure/storage/preferences-repository', () => ({
  PreferencesRepository: class {
    getPreferences = vi.fn().mockResolvedValue({})
    savePreferences = vi.fn().mockResolvedValue(undefined)

    constructor() {
      mocks.preferenceRepositoryInstances.push(this)
    }
  },
}))

vi.mock('../../electron/main/window', () => ({
  createOrFocusSettingsWindow: mocks.createOrFocusSettingsWindowMock,
}))

import { registerHandlers } from '../../electron/main/ipc/register-handlers'
import { channels } from '../../src/shared/ipc'

describe('preferences and file dialog handlers', () => {
  beforeEach(() => {
    mocks.registeredHandlers.clear()
    mocks.connectionServiceInstances.length = 0
    mocks.preferenceRepositoryInstances.length = 0
    mocks.sendMock.mockReset()
    mocks.showOpenDialogMock.mockReset()
    mocks.readFileMock.mockReset()
    mocks.writeFileMock.mockReset()
    mocks.createOrFocusSettingsWindowMock.mockClear()
  })

  it('imports connections from a selected json file', async () => {
    mocks.showOpenDialogMock.mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\imports\\connections.json'],
    })
    mocks.readFileMock.mockResolvedValue('[{"id":"imported-zk"}]')

    registerHandlers('D:/tmp/zkube')

    const importHandler = mocks.registeredHandlers.get(
      channels.connectionImportFromFile,
    )
    const connectionService = mocks.connectionServiceInstances.at(-1)
    const imported = [
      {
        id: 'imported-zk',
        name: 'Imported Cluster',
        hosts: '10.0.0.1:2181',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
      },
    ]

    connectionService?.importJson.mockResolvedValue(imported)

    await expect(importHandler?.({}, undefined)).resolves.toEqual(imported)
    expect(mocks.readFileMock).toHaveBeenCalledWith(
      'C:\\imports\\connections.json',
      'utf8',
    )
    expect(connectionService?.importJson).toHaveBeenCalledWith(
      '[{"id":"imported-zk"}]',
    )
  })

  it('exports connections into zkube-connections.json inside the chosen directory', async () => {
    mocks.showOpenDialogMock.mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\exports'],
    })

    registerHandlers('D:/tmp/zkube')

    const exportHandler = mocks.registeredHandlers.get(
      channels.connectionExportToFile,
    )
    const connectionService = mocks.connectionServiceInstances.at(-1)
    connectionService?.exportAll.mockResolvedValue('[{"id":"cluster-a"}]')

    await expect(exportHandler?.({}, undefined)).resolves.toEqual({
      filePath: 'C:\\exports\\zkube-connections.json',
    })
    expect(mocks.writeFileMock).toHaveBeenCalledWith(
      'C:\\exports\\zkube-connections.json',
      '[{"id":"cluster-a"}]',
      'utf8',
    )
  })

  it('treats canceled file and directory pickers as no-ops', async () => {
    mocks.showOpenDialogMock.mockResolvedValueOnce({
      canceled: true,
      filePaths: [],
    })
    mocks.showOpenDialogMock.mockResolvedValueOnce({
      canceled: true,
      filePaths: [],
    })

    registerHandlers('D:/tmp/zkube')

    const importHandler = mocks.registeredHandlers.get(
      channels.connectionImportFromFile,
    )
    const exportHandler = mocks.registeredHandlers.get(
      channels.connectionExportToFile,
    )
    const connectionService = mocks.connectionServiceInstances.at(-1)

    await expect(importHandler?.({}, undefined)).resolves.toBeNull()
    await expect(exportHandler?.({}, undefined)).resolves.toBeNull()
    expect(connectionService?.importJson).not.toHaveBeenCalled()
    expect(connectionService?.exportAll).not.toHaveBeenCalled()
    expect(mocks.writeFileMock).not.toHaveBeenCalled()
  })

  it('falls back to the system defaults when no saved preferences exist and broadcasts updates', async () => {
    registerHandlers('D:/tmp/zkube')

    const preferences = mocks.preferenceRepositoryInstances.at(-1)
    const getThemeHandler = mocks.registeredHandlers.get(
      channels.preferencesGetTheme,
    )
    const setThemeHandler = mocks.registeredHandlers.get(
      channels.preferencesSetTheme,
    )

    preferences?.getPreferences.mockResolvedValue({})

    await expect(getThemeHandler?.({}, undefined)).resolves.toEqual({
      theme: 'dark',
      language: 'en',
      fontSize: 'medium',
    })
    await expect(
      setThemeHandler?.(
        {},
        {
          theme: 'light' satisfies Theme,
          language: 'zh-CN',
          fontSize: 'large',
        },
      ),
    ).resolves.toEqual({
      theme: 'light',
      language: 'zh-CN',
      fontSize: 'large',
    })

    expect(preferences?.savePreferences).toHaveBeenCalledWith({
      theme: 'light',
      language: 'zh-CN',
      fontSize: 'large',
    })
    expect(mocks.sendMock).toHaveBeenCalledWith(
      channels.preferencesThemeChanged,
      {
        theme: 'light',
        language: 'zh-CN',
        fontSize: 'large',
      },
    )
  })

  it('deletes a connection through the ipc handler', async () => {
    registerHandlers('D:/tmp/zkube')

    const deleteHandler = mocks.registeredHandlers.get(channels.connectionDelete)
    const connectionService = mocks.connectionServiceInstances.at(-1)

    await deleteHandler?.({}, { connectionId: 'cluster-a' })

    expect(connectionService?.delete).toHaveBeenCalledWith('cluster-a')
  })

  it('opens or focuses the settings window through the ipc handler', async () => {
    registerHandlers('D:/tmp/zkube')

    const openSettingsHandler = mocks.registeredHandlers.get(
      channels.preferencesOpenSettings,
    )

    await openSettingsHandler?.({}, undefined)

    expect(mocks.createOrFocusSettingsWindowMock).toHaveBeenCalledTimes(1)
  })
})
