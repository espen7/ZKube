import { describe, expect, it } from 'vitest'

import {
  formatBytes,
  formatRelativeTime,
} from '../../src/renderer/features/tree/tree-formatters'

describe('tree formatters', () => {
  it('falls back to dashes for invalid relative time values', () => {
    expect(formatRelativeTime(null, 1_700_000_000_000)).toBe('--')
    expect(formatRelativeTime(undefined, 1_700_000_000_000)).toBe('--')
    expect(formatRelativeTime(0, 1_700_000_000_000)).toBe('--')
    expect(
      formatRelativeTime(Number.NaN as unknown as number, 1_700_000_000_000),
    ).toBe('--')
    expect(formatRelativeTime(1_700_000_000_000, Number.NaN)).toBe('--')
  })

  it('formats bytes defensively when metadata is missing', () => {
    expect(formatBytes(null)).toBe('--')
    expect(formatBytes(undefined)).toBe('--')
    expect(formatBytes(Number.NaN as unknown as number)).toBe('--')
  })
})
