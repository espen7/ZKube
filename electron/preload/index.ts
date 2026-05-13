import { contextBridge, ipcRenderer } from 'electron'

import {
  createDesktopApi,
  type EventChannel,
  type EventPayloadMap,
  type Transport,
} from '../../src/shared/ipc'

const transport: Transport = {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: <TChannel extends EventChannel>(
    channel: TChannel,
    cb: (payload: EventPayloadMap[TChannel]) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: EventPayloadMap[TChannel],
    ) => {
      cb(payload)
    }

    ipcRenderer.on(channel, listener)

    return () => ipcRenderer.removeListener(channel, listener)
  },
}

const api = createDesktopApi(transport)

contextBridge.exposeInMainWorld('zkube', api)
