import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { app, ipcMain } from 'electron'

import { channels } from '../../src/shared/ipc'
import { registerHandlers } from './ipc/register-handlers'
import { createMainWindow } from './window'

async function bootstrap() {
  const win = createMainWindow()
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const rendererHtmlPath = path.join(currentDir, '..', '..', 'dist', 'index.html')

  ipcMain.handle(channels.appGetVersion, () => ({ version: app.getVersion() }))
  ipcMain.handle(channels.appPing, () => ({ ok: true as const }))
  registerHandlers(app.getPath('userData'))

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(rendererHtmlPath)
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
