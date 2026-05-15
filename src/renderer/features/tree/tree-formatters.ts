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

  const megabytes = Math.round((value / (1024 * 1024)) * 10) / 10
  return `${Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes} MB`
}

export function formatBytesCompact(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  if (value < 1024) {
    return `${value}B`
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)}KB`
  }

  const megabytes = Math.round((value / (1024 * 1024)) * 10) / 10
  return `${Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes}MB`
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

export function formatRelativeTimeCompact(
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

  const ageMs = Math.max(now - value, 0)

  if (ageMs < 60_000) {
    return '<1m'
  }

  if (ageMs < 3_600_000) {
    return `${Math.max(1, Math.round(ageMs / 60_000))}m`
  }

  if (ageMs < 86_400_000) {
    return `${Math.max(1, Math.round(ageMs / 3_600_000))}h`
  }

  return `${Math.max(1, Math.round(ageMs / 86_400_000))}d`
}
