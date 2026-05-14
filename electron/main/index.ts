import path from 'node:path'

import { app, ipcMain, Menu } from 'electron'

import { channels } from '../../src/shared/ipc'
import { registerHandlers } from './ipc/register-handlers'
import { configureRendererTarget, createMainWindow } from './window'

async function bootstrap() {
  const rendererHtmlPath = path.join(app.getAppPath(), 'dist', 'index.html')
  Menu.setApplicationMenu(null)
  configureRendererTarget({
    devServerUrl: process.env.VITE_DEV_SERVER_URL,
    htmlPath: rendererHtmlPath,
  })

  ipcMain.handle(channels.appGetVersion, () => ({ version: app.getVersion() }))
  ipcMain.handle(channels.appPing, () => ({ ok: true as const }))
  registerHandlers(app.getPath('userData'))
  await createMainWindow()
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
