import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('dev electron runtime guards', () => {
  it('ignores exit events from stale Electron processes', async () => {
    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'dev-electron-runtime.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      shouldHandleElectronExit: (input: {
        exitedPid?: number
        activePid?: number
        isShuttingDown: boolean
        isRestartingElectron: boolean
      }) => boolean
    }

    expect(
      mod.shouldHandleElectronExit({
        exitedPid: 101,
        activePid: 202,
        isShuttingDown: false,
        isRestartingElectron: false,
      }),
    ).toBe(false)
  })

  it('ignores the first file-change event from each watched Electron bundle', async () => {
    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'dev-electron-runtime.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      createFileChangeFilter: () => (filePath: string) => boolean
    }

    const shouldRestartFor = mod.createFileChangeFilter()

    expect(shouldRestartFor('dist-electron/main/index.cjs')).toBe(false)
    expect(shouldRestartFor('dist-electron/main/index.cjs')).toBe(true)
    expect(shouldRestartFor('dist-electron/preload/index.cjs')).toBe(false)
    expect(shouldRestartFor('dist-electron/preload/index.cjs')).toBe(true)
  })

  it('ignores watch events during the startup quiet period', async () => {
    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'dev-electron-runtime.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      createStartupQuietPeriodGuard: (
        quietPeriodMs: number,
        now: () => number,
      ) => () => boolean
    }

    let currentTime = 1_000
    const shouldRestartNow = mod.createStartupQuietPeriodGuard(
      1_000,
      () => currentTime,
    )

    expect(shouldRestartNow()).toBe(false)
    currentTime = 1_500
    expect(shouldRestartNow()).toBe(false)
    currentTime = 2_001
    expect(shouldRestartNow()).toBe(true)
  })
})
