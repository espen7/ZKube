import { app, ipcMain } from 'electron'

import { channels } from '../../src/shared/ipc'
import { createMainWindow } from './window'

async function bootstrap() {
  const win = createMainWindow()

  ipcMain.handle(channels.appGetVersion, () => ({ version: app.getVersion() }))
  ipcMain.handle(channels.appPing, () => ({ ok: true as const }))

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile('dist/index.html')
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
