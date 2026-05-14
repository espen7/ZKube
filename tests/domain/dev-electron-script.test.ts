import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('dev electron script', () => {
  it('provides a one-command Electron development entrypoint', async () => {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')
    const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(rawPackageJson) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.['dev:electron']).toBe(
      'node scripts/dev-electron.mjs',
    )

    const launcherPath = path.resolve(process.cwd(), 'scripts', 'dev-electron.mjs')
    await expect(fs.access(launcherPath)).resolves.toBeUndefined()
  })
})
