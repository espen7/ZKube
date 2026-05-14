import type { ConnectionState } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import {
  getConnectionStatusLabel,
  getConnectionStatusTone,
} from './connection-state'

type ConnectionStateBadgeProps = {
  ariaLabel: string
  state: ConnectionState
}

export function ConnectionStateBadge({
  ariaLabel,
  state,
}: ConnectionStateBadgeProps) {
  const { language } = useI18n()
  const tone = getConnectionStatusTone(state)

  return (
    <span
      aria-label={ariaLabel}
      className={`connection-state-badge connection-state-badge--${tone}`}
      data-state={state}
    >
      <span aria-hidden="true" className="connection-state-badge__dot" />
      <span>{getConnectionStatusLabel(state, language)}</span>
    </span>
  )
}
