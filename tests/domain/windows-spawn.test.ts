import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('Windows spawn normalization', () => {
  it('runs .cmd launchers through the shell on Windows', async () => {
    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'spawn-command.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      normalizeSpawnCommand: (
        command: string,
        args: string[],
        platform: NodeJS.Platform,
      ) => {
        command: string
        args: string[]
        shell?: boolean
      }
    }

    const result = mod.normalizeSpawnCommand(
      'D:\\workspace\\repo37\\ZKube\\node_modules\\.bin\\vite.cmd',
      ['build'],
      'win32',
    )

    expect(result).toEqual({
      command: 'D:\\workspace\\repo37\\ZKube\\node_modules\\.bin\\vite.cmd',
      args: ['build'],
      shell: true,
    })
  })

  it('builds strict Vite dev server args from the configured url', async () => {
    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'spawn-command.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      buildViteDevArgs: (url: string) => string[]
    }

    expect(mod.buildViteDevArgs('http://localhost:5173')).toEqual([
      '--strictPort',
      '--port',
      '5173',
    ])
  })
})
