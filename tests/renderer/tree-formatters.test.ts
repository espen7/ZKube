import { describe, expect, it } from 'vitest'

import {
  formatBytes,
  formatBytesCompact,
  formatRelativeTime,
  formatRelativeTimeCompact,
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

  it('formats bytes using compact redis-style units', () => {
    expect(formatBytesCompact(128)).toBe('128B')
    expect(formatBytesCompact(2_048)).toBe('2KB')
    expect(formatBytesCompact(1_363_149)).toBe('1.3MB')
  })

  it('formats relative time using compact redis-style units', () => {
    const now = 1_700_000_000_000

    expect(formatRelativeTimeCompact(now - 22 * 86_400_000, now)).toBe('22d')
    expect(formatRelativeTimeCompact(now - 3 * 3_600_000, now)).toBe('3h')
    expect(formatRelativeTimeCompact(now - 8 * 60_000, now)).toBe('8m')
    expect(formatRelativeTimeCompact(now - 15_000, now)).toBe('<1m')
  })
})
