import { contextBridge, ipcRenderer } from 'electron'

import { createDesktopApi } from '../../src/shared/ipc'

const api = createDesktopApi({
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: <T>(channel: string, cb: (payload: T) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: T) => {
      cb(payload)
    }

    ipcRenderer.on(channel, listener)

    return () => ipcRenderer.removeListener(channel, listener)
  },
})

contextBridge.exposeInMainWorld('zkube', api)
