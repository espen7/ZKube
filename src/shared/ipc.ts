import type {
  ConnectionDraft,
  StoredConnection,
} from './models/connection'
import type {
  AclEntry,
  NodeSnapshot,
  RuntimeEvent,
  TreeNodeRow,
} from './models/node'
import type {
  Preferences,
  Theme,
} from './models/preferences'

type PreferencesUpdate = Partial<Preferences>

export const channels = {
  appGetVersion: 'app:getVersion',
  appPing: 'app:ping',
  connectionList: 'connection:list',
  connectionSave: 'connection:save',
  connectionDelete: 'connection:delete',
  connectionExport: 'connection:export',
  connectionImport: 'connection:import',
  connectionExportToFile: 'connection:exportToFile',
  connectionImportFromFile: 'connection:importFromFile',
  connectionConnect: 'connection:connect',
  preferencesGetTheme: 'preferences:getTheme',
  preferencesSetTheme: 'preferences:setTheme',
  preferencesOpenSettings: 'preferences:openSettings',
  preferencesThemeChanged: 'preferences:themeChanged',
  zookeeperDisconnect: 'zookeeper:disconnect',
  zookeeperLoadChildren: 'zookeeper:loadChildren',
  zookeeperOpen: 'zookeeper:open',
  zookeeperSearch: 'zookeeper:search',
  zookeeperCreate: 'zookeeper:create',
  zookeeperDelete: 'zookeeper:delete',
  zookeeperUpdate: 'zookeeper:update',
  zookeeperSaveAcl: 'zookeeper:saveAcl',
  runtimeEvent: 'runtime:event',
} as const

export type RuntimeEventPayload = RuntimeEvent
export type BinaryPayload = Uint8Array

export type InvokeRequestMap = {
  [channels.appGetVersion]: undefined
  [channels.appPing]: undefined
  [channels.connectionList]: undefined
  [channels.connectionSave]: ConnectionDraft
  [channels.connectionDelete]: { connectionId: string }
  [channels.connectionExport]: undefined
  [channels.connectionImport]: { json: string }
  [channels.connectionExportToFile]: undefined
  [channels.connectionImportFromFile]: undefined
  [channels.connectionConnect]: { connectionId: string }
  [channels.preferencesGetTheme]: undefined
  [channels.preferencesSetTheme]: PreferencesUpdate
  [channels.preferencesOpenSettings]: undefined
  [channels.zookeeperDisconnect]: undefined
  [channels.zookeeperLoadChildren]: { path: string }
  [channels.zookeeperOpen]: { path: string }
  [channels.zookeeperSearch]: { query: string }
  [channels.zookeeperCreate]: { path: string; data: BinaryPayload }
  [channels.zookeeperDelete]: { path: string; version?: number }
  [channels.zookeeperUpdate]: {
    path: string
    data: BinaryPayload
    version?: number
  }
  [channels.zookeeperSaveAcl]: { path: string; acl: AclEntry[] }
}

export type InvokeResponseMap = {
  [channels.appGetVersion]: { version: string }
  [channels.appPing]: { ok: true }
  [channels.connectionList]: StoredConnection[]
  [channels.connectionSave]: StoredConnection
  [channels.connectionDelete]: void
  [channels.connectionExport]: string
  [channels.connectionImport]: StoredConnection[]
  [channels.connectionExportToFile]: { filePath: string } | null
  [channels.connectionImportFromFile]: StoredConnection[] | null
  [channels.connectionConnect]: void
  [channels.preferencesGetTheme]: Preferences
  [channels.preferencesSetTheme]: Preferences
  [channels.preferencesOpenSettings]: void
  [channels.zookeeperDisconnect]: void
  [channels.zookeeperLoadChildren]: TreeNodeRow[]
  [channels.zookeeperOpen]: NodeSnapshot
  [channels.zookeeperSearch]: string[]
  [channels.zookeeperCreate]: void
  [channels.zookeeperDelete]: void
  [channels.zookeeperUpdate]: void
  [channels.zookeeperSaveAcl]: void
}

export type EventPayloadMap = {
  [channels.runtimeEvent]: RuntimeEventPayload
  [channels.preferencesThemeChanged]: Preferences
}

export type InvokeChannel = keyof InvokeRequestMap
export type EventChannel = keyof EventPayloadMap

export interface Transport {
  invoke<TChannel extends InvokeChannel>(
    channel: TChannel,
    payload: InvokeRequestMap[TChannel],
  ): Promise<InvokeResponseMap[TChannel]>
  on<TChannel extends EventChannel>(
    channel: TChannel,
    cb: (payload: EventPayloadMap[TChannel]) => void,
  ): () => void
}

export interface DesktopApi {
  app: {
    getVersion(): Promise<InvokeResponseMap[typeof channels.appGetVersion]>
    ping(): Promise<InvokeResponseMap[typeof channels.appPing]>
  }
  connections: {
    list(): Promise<InvokeResponseMap[typeof channels.connectionList]>
    save(
      draft: InvokeRequestMap[typeof channels.connectionSave],
    ): Promise<InvokeResponseMap[typeof channels.connectionSave]>
    delete?(connectionId: string): Promise<void>
    exportAll(): Promise<InvokeResponseMap[typeof channels.connectionExport]>
    importJson(
      json: string,
    ): Promise<InvokeResponseMap[typeof channels.connectionImport]>
    importFromFile?(): Promise<
      InvokeResponseMap[typeof channels.connectionImportFromFile]
    >
    exportToFile?(): Promise<
      InvokeResponseMap[typeof channels.connectionExportToFile]
    >
    connect(connectionId: string): Promise<void>
  }
  preferences?: {
    getTheme(): Promise<InvokeResponseMap[typeof channels.preferencesGetTheme]>
    setTheme(
      theme: Theme | PreferencesUpdate,
    ): Promise<InvokeResponseMap[typeof channels.preferencesSetTheme]>
    openSettingsWindow(): Promise<void>
    subscribeTheme(cb: (payload: Preferences) => void): () => void
  }
  zookeeper: {
    disconnect(): Promise<void>
    loadChildren(
      path: string,
    ): Promise<InvokeResponseMap[typeof channels.zookeeperLoadChildren]>
    open(path: string): Promise<InvokeResponseMap[typeof channels.zookeeperOpen]>
    search(
      query: string,
    ): Promise<InvokeResponseMap[typeof channels.zookeeperSearch]>
    create(path: string, data: BinaryPayload): Promise<void>
    delete(path: string, version?: number): Promise<void>
    update(path: string, data: BinaryPayload, version?: number): Promise<void>
    saveAcl(path: string, acl: AclEntry[]): Promise<void>
  }
  runtime: {
    subscribe(cb: (payload: RuntimeEventPayload) => void): () => void
  }
}

export function createDesktopApi(transport: Transport): DesktopApi {
  return {
    app: {
      getVersion: () => transport.invoke(channels.appGetVersion, undefined),
      ping: () => transport.invoke(channels.appPing, undefined),
    },
    connections: {
      list: () => transport.invoke(channels.connectionList, undefined),
      save: (draft) => transport.invoke(channels.connectionSave, draft),
      delete: (connectionId) =>
        transport.invoke(channels.connectionDelete, { connectionId }),
      exportAll: () => transport.invoke(channels.connectionExport, undefined),
      importJson: (json) =>
        transport.invoke(channels.connectionImport, { json }),
      importFromFile: () =>
        transport.invoke(channels.connectionImportFromFile, undefined),
      exportToFile: () =>
        transport.invoke(channels.connectionExportToFile, undefined),
      connect: (connectionId) =>
        transport.invoke(channels.connectionConnect, { connectionId }),
    },
    preferences: {
      getTheme: () => transport.invoke(channels.preferencesGetTheme, undefined),
      setTheme: (theme) =>
        transport.invoke(
          channels.preferencesSetTheme,
          typeof theme === 'string' ? { theme } : theme,
        ),
      openSettingsWindow: () =>
        transport.invoke(channels.preferencesOpenSettings, undefined),
      subscribeTheme: (cb) =>
        transport.on(channels.preferencesThemeChanged, cb),
    },
    zookeeper: {
      disconnect: () => transport.invoke(channels.zookeeperDisconnect, undefined),
      loadChildren: (path) =>
        transport.invoke(channels.zookeeperLoadChildren, { path }),
      open: (path) => transport.invoke(channels.zookeeperOpen, { path }),
      search: (query) => transport.invoke(channels.zookeeperSearch, { query }),
      create: (path, data) =>
        transport.invoke(channels.zookeeperCreate, { path, data }),
      delete: (path, version) =>
        transport.invoke(channels.zookeeperDelete, { path, version }),
      update: (path, data, version) =>
        transport.invoke(channels.zookeeperUpdate, { path, data, version }),
      saveAcl: (path, acl) =>
        transport.invoke(channels.zookeeperSaveAcl, { path, acl }),
    },
    runtime: {
      subscribe: (cb) => transport.on(channels.runtimeEvent, cb),
    },
  }
}
