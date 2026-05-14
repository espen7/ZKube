import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  whenReadyMock: vi.fn(() => Promise.resolve()),
  getAppPathMock: vi.fn(() => 'D:/workspace/repo37/ZKube'),
  getPathMock: vi.fn(() => 'D:/workspace/repo37/ZKube/.userData'),
  getVersionMock: vi.fn(() => '0.1.0'),
  appOnMock: vi.fn(),
  quitMock: vi.fn(),
  ipcHandleMock: vi.fn(),
  setApplicationMenuMock: vi.fn(),
  registerHandlersMock: vi.fn(),
  configureRendererTargetMock: vi.fn(),
  createMainWindowMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('electron', () => ({
  app: {
    whenReady: mocks.whenReadyMock,
    getAppPath: mocks.getAppPathMock,
    getPath: mocks.getPathMock,
    getVersion: mocks.getVersionMock,
    on: mocks.appOnMock,
    quit: mocks.quitMock,
  },
  ipcMain: {
    handle: mocks.ipcHandleMock,
  },
  Menu: {
    setApplicationMenu: mocks.setApplicationMenuMock,
  },
}))

vi.mock('../../electron/main/ipc/register-handlers', () => ({
  registerHandlers: mocks.registerHandlersMock,
}))

vi.mock('../../electron/main/window', () => ({
  configureRendererTarget: mocks.configureRendererTargetMock,
  createMainWindow: mocks.createMainWindowMock,
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.whenReadyMock.mockClear()
    mocks.getAppPathMock.mockClear()
    mocks.getPathMock.mockClear()
    mocks.getVersionMock.mockClear()
    mocks.appOnMock.mockClear()
    mocks.quitMock.mockClear()
    mocks.ipcHandleMock.mockClear()
    mocks.setApplicationMenuMock.mockClear()
    mocks.registerHandlersMock.mockClear()
    mocks.configureRendererTargetMock.mockClear()
    mocks.createMainWindowMock.mockClear()
    mocks.createMainWindowMock.mockResolvedValue(undefined)
  })

  it('clears the application menu during bootstrap', async () => {
    await import('../../electron/main/index')
    await Promise.resolve()

    expect(mocks.setApplicationMenuMock).toHaveBeenCalledWith(null)
    expect(mocks.createMainWindowMock).toHaveBeenCalledTimes(1)
  })
})
