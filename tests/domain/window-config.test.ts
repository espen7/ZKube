import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  browserWindowOptions: [] as Array<Record<string, unknown>>,
  loadURLMock: vi.fn().mockResolvedValue(undefined),
  loadFileMock: vi.fn().mockResolvedValue(undefined),
  onMock: vi.fn(),
  focusMock: vi.fn(),
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
  },
}))

import {
  configureRendererTarget,
  createOrFocusSettingsWindow,
} from '../../electron/main/window'

describe('settings window configuration', () => {
  beforeEach(() => {
    mocks.browserWindowOptions.length = 0
    mocks.loadURLMock.mockClear()
    mocks.loadFileMock.mockClear()
    mocks.onMock.mockClear()
    mocks.focusMock.mockClear()
    configureRendererTarget({
      devServerUrl: 'http://localhost:5173',
      htmlPath: 'D:/workspace/repo37/ZKube/dist/index.html',
    })
  })

  it('creates a resizable settings window with enough room for the settings form', async () => {
    await createOrFocusSettingsWindow()

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
})
