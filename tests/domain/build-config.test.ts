import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('build configuration', () => {
  it('builds Electron bundles without post-build patch scripts', async () => {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')
    const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(rawPackageJson) as {
      main: string
      scripts: Record<string, string>
    }

    expect(packageJson.main).toBe('dist-electron/main/index.cjs')
    expect(packageJson.scripts['build:electron:main']).not.toContain(
      'patch:electron-main-bundle',
    )
    expect(packageJson.scripts['build:electron:preload']).not.toContain(
      'patch:electron-preload-bundle',
    )
  })
})
