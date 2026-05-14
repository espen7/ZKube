import type { ConnectionState } from '../../../shared/models/node'
import type { Language } from '../../../shared/models/preferences'
import { translate } from '../../i18n'

export function getConnectionStatusLabel(
  state: ConnectionState,
  language: Language = 'en',
): string {
  switch (state) {
    case 'connected':
      return translate(language, 'status.healthy')
    case 'connecting':
      return translate(language, 'status.connecting')
    case 'reconnecting':
      return translate(language, 'status.reconnecting')
    case 'disconnected':
      return translate(language, 'status.disconnected')
  }
}

export function getConnectionStatusTone(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'healthy'
    case 'connecting':
    case 'reconnecting':
      return 'pending'
    case 'disconnected':
      return 'disconnected'
  }
}

export function getConnectionRuntimeMessage(
  state: ConnectionState,
  language: Language = 'en',
): string {
  switch (state) {
    case 'connected':
      return translate(language, 'status.messageHealthy')
    case 'connecting':
      return translate(language, 'status.messageConnecting')
    case 'reconnecting':
      return translate(language, 'status.messageReconnecting')
    case 'disconnected':
      return translate(language, 'status.messageDisconnected')
  }
}
