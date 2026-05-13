import path from 'node:path'

import { app, BrowserWindow } from 'electron'

export function createMainWindow() {
  const preloadPath = path.join(
    app.getAppPath(),
    'dist-electron',
    'preload',
    'index.cjs',
  )

  return new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
}
