type ToastRegionProps = {
  message: string | null
}

export function ToastRegion({ message }: ToastRegionProps) {
  if (!message) {
    return null
  }

  return (
    <div
      aria-label="Runtime toast region"
      aria-live="polite"
      aria-atomic="true"
      role="status"
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '56px',
        maxWidth: '320px',
        padding: '12px 14px',
        border: '1px solid rgba(36, 200, 165, 0.28)',
        borderRadius: '12px',
        background: 'rgba(7, 17, 31, 0.94)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.25)',
        color: 'var(--text-main)',
        zIndex: 10,
      }}
    >
      {message}
    </div>
  )
}
