import path from 'node:path'

import { app, BrowserWindow } from 'electron'

type WindowMode = 'main' | 'settings'

type RendererTarget = {
  devServerUrl?: string
  htmlPath: string
}

let rendererTarget: RendererTarget | null = null
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function getWindowIconPath() {
  return path.join(app.getAppPath(), 'build', 'icon.ico')
}

function hideWindowMenu(window: BrowserWindow) {
  window.setMenuBarVisibility(false)
  window.removeMenu()
}

export function configureRendererTarget(target: RendererTarget) {
  rendererTarget = target
}

export async function createMainWindow() {
  const preloadPath = path.join(
    app.getAppPath(),
    'dist-electron',
    'preload',
    'index.cjs',
  )

  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    icon: getWindowIconPath(),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow = window
  hideWindowMenu(window)
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  await loadRenderer(window, 'main')

  return window
}

export async function createOrFocusSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    hideWindowMenu(settingsWindow)
    settingsWindow.focus()
    return settingsWindow
  }

  const preloadPath = path.join(
    app.getAppPath(),
    'dist-electron',
    'preload',
    'index.cjs',
  )

  const window = new BrowserWindow({
    width: 720,
    height: 640,
    minWidth: 640,
    minHeight: 560,
    resizable: true,
    maximizable: true,
    icon: getWindowIconPath(),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    parent: mainWindow ?? undefined,
    title: 'ZKube Settings',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  settingsWindow = window
  hideWindowMenu(window)
  window.on('closed', () => {
    if (settingsWindow === window) {
      settingsWindow = null
    }
  })

  await loadRenderer(window, 'settings')

  return window
}

async function loadRenderer(window: BrowserWindow, mode: WindowMode) {
  if (!rendererTarget) {
    throw new Error('Renderer target is not configured')
  }

  if (rendererTarget.devServerUrl) {
    const url = new URL(rendererTarget.devServerUrl)
    url.searchParams.set('window', mode)
    await window.loadURL(url.toString())
    if (mode === 'main') {
      window.webContents.openDevTools({ mode: 'detach' })
    }
    return
  }

  await window.loadFile(rendererTarget.htmlPath, {
    query: {
      window: mode,
    },
  })
}
