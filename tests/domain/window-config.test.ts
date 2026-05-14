import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  browserWindowOptions: [] as Array<Record<string, unknown>>,
  loadURLMock: vi.fn().mockResolvedValue(undefined),
  loadFileMock: vi.fn().mockResolvedValue(undefined),
  onMock: vi.fn(),
  focusMock: vi.fn(),
  removeMenuMock: vi.fn(),
  setMenuBarVisibilityMock: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: vi.fn(() => 'D:/workspace/repo37/ZKube'),
  },
  BrowserWindow: class {
    webContents = {
      openDevTools: vi.fn(),
    }

    constructor(options: Record<string, unknown>) {
      mocks.browserWindowOptions.push(options)
    }

    loadURL = mocks.loadURLMock
    loadFile = mocks.loadFileMock
    on = mocks.onMock
    isDestroyed = vi.fn(() => false)
    focus = mocks.focusMock
    removeMenu = mocks.removeMenuMock
    setMenuBarVisibility = mocks.setMenuBarVisibilityMock
  },
}))

type WindowModule = typeof import('../../electron/main/window')

describe('settings window configuration', () => {
  let windowModule: WindowModule

  beforeEach(() => {
    vi.resetModules()
    mocks.browserWindowOptions.length = 0
    mocks.loadURLMock.mockClear()
    mocks.loadFileMock.mockClear()
    mocks.onMock.mockClear()
    mocks.focusMock.mockClear()
    mocks.removeMenuMock.mockClear()
    mocks.setMenuBarVisibilityMock.mockClear()
  })

  beforeEach(async () => {
    windowModule = await import('../../electron/main/window')
    windowModule.configureRendererTarget({
      devServerUrl: 'http://localhost:5173',
      htmlPath: 'D:/workspace/repo37/ZKube/dist/index.html',
    })
  })

  it('creates a resizable settings window with enough room for the settings form', async () => {
    await windowModule.createOrFocusSettingsWindow()

    expect(mocks.browserWindowOptions).toHaveLength(1)
    expect(mocks.browserWindowOptions[0]).toEqual(
      expect.objectContaining({
        width: 720,
        height: 640,
        minWidth: 640,
        minHeight: 560,
        resizable: true,
        maximizable: true,
      }),
    )
  })

  it('uses the generated application icon for the desktop windows', async () => {
    await windowModule.createMainWindow()
    await windowModule.createOrFocusSettingsWindow()

    expect(mocks.browserWindowOptions).toHaveLength(2)
    expect(mocks.browserWindowOptions[0]).toEqual(
      expect.objectContaining({
        icon: 'D:\\workspace\\repo37\\ZKube\\build\\icon.ico',
        autoHideMenuBar: true,
      }),
    )
    expect(mocks.browserWindowOptions[1]).toEqual(
      expect.objectContaining({
        icon: 'D:\\workspace\\repo37\\ZKube\\build\\icon.ico',
        autoHideMenuBar: true,
      }),
    )
    expect(mocks.setMenuBarVisibilityMock).toHaveBeenNthCalledWith(1, false)
    expect(mocks.setMenuBarVisibilityMock).toHaveBeenNthCalledWith(2, false)
  })
})
