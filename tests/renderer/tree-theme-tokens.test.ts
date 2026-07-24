import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('tree theme tokens', () => {
  it('uses colder alternating row colors in the light theme', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/renderer/styles/tokens.css'),
      'utf8',
    )

    expect(css).toContain('--tree-row-odd: #ffffff;')
    expect(css).toContain('--tree-row-even: #fbfbfd;')
    expect(css).toContain('--tree-row-hover: #f0f6ff;')
  })
})
