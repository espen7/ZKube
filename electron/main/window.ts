import { fileURLToPath } from 'node:url'

import { BrowserWindow } from 'electron'

export function createMainWindow() {
  const preloadPath = fileURLToPath(new URL('../preload/index.js', import.meta.url))

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
