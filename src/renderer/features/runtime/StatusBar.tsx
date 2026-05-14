import type { ConnectionState } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { ConnectionStateBadge } from './ConnectionStateBadge'

type StatusBarProps = {
  connectionState: ConnectionState
  watcherCount: number
  message: string | null
}

export function StatusBar({
  connectionState,
  watcherCount,
  message,
}: StatusBarProps) {
  const { t } = useI18n()

  return (
    <div aria-label="Runtime status bar" className="status-bar">
      <ConnectionStateBadge
        ariaLabel="Connection status indicator"
        state={connectionState}
      />
      <span>{t('runtime.watchers', { count: watcherCount })}</span>
      <span>{message ?? t('runtime.waiting')}</span>
    </div>
  )
}
