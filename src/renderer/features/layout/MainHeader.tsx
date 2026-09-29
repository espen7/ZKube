import { LinearProgress } from '@mui/material'

import type { ConnectionState } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { ConnectionStateBadge } from '../runtime/ConnectionStateBadge'

type MainHeaderProps = {
  connectionState: ConnectionState
  connectionName: string | null
  connectionHosts: string | null
}

export function MainHeader({
  connectionState,
  connectionName,
  connectionHosts,
}: MainHeaderProps) {
  const { t } = useI18n()
  const isBusy =
    connectionState === 'connecting' || connectionState === 'reconnecting'

  return (
    <header aria-label="Main header" className="main-header">
      <div className="main-header__context">
        {connectionName ? (
          <>
            <span className="main-header__name">{connectionName}</span>
            <span className="main-header__host">{connectionHosts}</span>
            <ConnectionStateBadge
              ariaLabel="Connection status indicator"
              state={connectionState}
            />
          </>
        ) : (
          <>
            <span className="main-header__name">ZKube</span>
            <span className="main-header__host">{t('app.subtitle')}</span>
          </>
        )}
      </div>
      {isBusy ? (
        <LinearProgress
          aria-label="Global progress indicator"
          className="main-header__progress"
          color="primary"
        />
      ) : null}
    </header>
  )
}
