type StatusBarProps = {
  connectionState: 'connected' | 'disconnected' | 'reconnecting'
  watcherCount: number
  message: string | null
}

export function StatusBar({
  connectionState,
  watcherCount,
  message,
}: StatusBarProps) {
  return (
    <div
      aria-label="Runtime status bar"
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <span>{connectionState}</span>
      <span>{`watchers: ${watcherCount}`}</span>
      <span>{message ?? 'Waiting for runtime events'}</span>
    </div>
  )
}
