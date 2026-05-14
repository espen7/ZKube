import type { ConnectionState } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { ConnectionStateBadge } from './ConnectionStateBadge'

type StatusBarProps = {
  connectionState: ConnectionState
  activeConnectionName?: string | null
  activeConnectionHosts?: string | null
  watcherCount: number
  message: string | null
}

export function StatusBar({
  connectionState,
  activeConnectionName,
  activeConnectionHosts,
  watcherCount,
  message,
}: StatusBarProps) {
  const { t } = useI18n()
  const statusLabel =
    connectionState === 'connected'
      ? t('status.healthy')
      : connectionState === 'connecting'
        ? t('status.connecting')
        : connectionState === 'reconnecting'
          ? t('status.reconnecting')
          : t('status.disconnected')
  const identityText =
    activeConnectionName && activeConnectionHosts
      ? `${statusLabel} · ${activeConnectionName} / ${activeConnectionHosts}`
      : null

  return (
    <div aria-label="Runtime status bar" className="status-bar">
      <div className="status-bar__primary">
        <ConnectionStateBadge
          ariaLabel="Connection status indicator"
          state={connectionState}
        />
        {identityText ? (
          <span className="status-bar__identity">{identityText}</span>
        ) : null}
      </div>
      <span className="status-bar__watchers">
        {t('runtime.watchers', { count: watcherCount })}
      </span>
      <span className="status-bar__message">{message ?? t('runtime.waiting')}</span>
    </div>
  )
}
