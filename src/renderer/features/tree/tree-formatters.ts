export function formatBytes(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }

  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`
}

export function formatRelativeTime(
  value: number | null | undefined,
  now = Date.now(),
): string {
  if (
    typeof value !== 'number' ||
    value <= 0 ||
    !Number.isFinite(value) ||
    !Number.isFinite(now)
  ) {
    return '--'
  }

  const diffMs = value - now
  const absMs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absMs < 60_000) {
    return rtf.format(Math.round(diffMs / 1000), 'second')
  }

  if (absMs < 3_600_000) {
    return rtf.format(Math.round(diffMs / 60_000), 'minute')
  }

  if (absMs < 86_400_000) {
    return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
  }

  return rtf.format(Math.round(diffMs / 86_400_000), 'day')
}
