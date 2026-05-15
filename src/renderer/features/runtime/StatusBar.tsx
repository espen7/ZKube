import type { ReactNode } from 'react'

import type { ConnectionState, ZooKeeperOverview } from '../../../shared/models/node'
import { LucideIcon } from '../../components/LucideIcon'
import { useI18n } from '../../use-i18n'
import { ConnectionStateBadge } from './ConnectionStateBadge'

type StatusBarProps = {
  connectionState: ConnectionState
  activeConnectionName?: string | null
  activeConnectionHosts?: string | null
  overview?: ZooKeeperOverview | null
  watcherCount: number
  message: string | null
}

type OverviewMetricProps = {
  description?: string
  icon: ReactNode
  iconName: string
  label: string
  testId: string
  value: string
}

type OverviewMetricDefinition = {
  icon: ReactNode
  iconName: string
  key: string
  label: string
  description?: string
  testId: string
  value: string | null
}

function formatCount(value: number | null): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}` : null
}

function formatLatency(value: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${rounded}ms`
}

function ConnectionsIcon() {
  return (
    <LucideIcon name="plug-zap">
      <path d="M6 9v6" />
      <path d="M18 9v6" />
      <path d="M12 3v6" />
      <path d="M9 12h6" />
      <path d="M8 15a4 4 0 1 0 8 0V9H8z" />
    </LucideIcon>
  )
}

function RoleIcon() {
  return (
    <LucideIcon name="badge-info">
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
      <path d="M7 4h10l3 3v10l-3 3H7l-3-3V7z" />
    </LucideIcon>
  )
}

function LatencyIcon() {
  return (
    <LucideIcon name="gauge">
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path d="M12 19v-1" />
    </LucideIcon>
  )
}

function ZnodesIcon() {
  return (
    <LucideIcon name="network">
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <path d="M12 8v4" />
      <path d="M5 16v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2" />
    </LucideIcon>
  )
}

function PacketsTxIcon() {
  return (
    <LucideIcon name="arrow-up-from-line">
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
      <path d="M5 21h14" />
    </LucideIcon>
  )
}

function PacketsRxIcon() {
  return (
    <LucideIcon name="arrow-down-to-line">
      <path d="M12 5v14" />
      <path d="m18 13-6 6-6-6" />
      <path d="M5 21h14" />
    </LucideIcon>
  )
}

function OverviewMetric({
  description,
  icon,
  iconName,
  label,
  testId,
  value,
}: OverviewMetricProps) {
  const tooltip = description ? `${label}: ${value}. ${description}` : `${label}: ${value}`

  return (
    <span
      aria-label={`${label}: ${value}`}
      className="status-bar__overview-item"
      title={tooltip}
    >
      <span
        className="status-bar__overview-icon"
        data-icon={`lucide-${iconName}`}
        data-testid={testId}
      >
        {icon}
      </span>
      <span className="status-bar__overview-value">{value}</span>
    </span>
  )
}

function getOverviewMetrics(
  overview: ZooKeeperOverview | null | undefined,
  t: (key: string, variables?: Record<string, string | number>) => string,
) {
  if (!overview?.available) {
    return [] as Array<{
      description?: string
      icon: ReactNode
      iconName: string
      key: string
      label: string
      testId: string
      value: string
    }>
  }

  const metrics: OverviewMetricDefinition[] = [
    {
      key: 'connections',
      label: t('workbench.overviewConnections'),
      description: t('workbench.overviewConnectionsDescription'),
      value: formatCount(overview.numAliveConnections),
      icon: <ConnectionsIcon />,
      iconName: 'plug-zap',
      testId: 'status-overview-connections',
    },
    {
      key: 'role',
      label: t('workbench.overviewRole'),
      description: t('workbench.overviewRoleDescription'),
      value:
        overview.serverState === 'unknown'
          ? t('workbench.overviewUnknown')
          : overview.serverState,
      icon: <RoleIcon />,
      iconName: 'badge-info',
      testId: 'status-overview-role',
    },
    {
      key: 'latency',
      label: t('workbench.overviewLatency'),
      description: t('workbench.overviewLatencyDescription'),
      value: formatLatency(overview.avgLatency),
      icon: <LatencyIcon />,
      iconName: 'gauge',
      testId: 'status-overview-latency',
    },
    {
      key: 'znodes',
      label: t('workbench.overviewZnodes'),
      description: t('workbench.overviewZnodesDescription'),
      value: formatCount(overview.znodeCount),
      icon: <ZnodesIcon />,
      iconName: 'network',
      testId: 'status-overview-znodes',
    },
    {
      key: 'packets-tx',
      label: t('workbench.overviewPacketsTx'),
      description: t('workbench.overviewPacketsTxDescription'),
      value: formatCount(overview.packetsSent),
      icon: <PacketsTxIcon />,
      iconName: 'arrow-up-from-line',
      testId: 'status-overview-packets-tx',
    },
    {
      key: 'packets-rx',
      label: t('workbench.overviewPacketsRx'),
      description: t('workbench.overviewPacketsRxDescription'),
      value: formatCount(overview.packetsReceived),
      icon: <PacketsRxIcon />,
      iconName: 'arrow-down-to-line',
      testId: 'status-overview-packets-rx',
    },
  ]

  return metrics.reduce<
    Array<{
      description?: string
      icon: ReactNode
      iconName: string
      key: string
      label: string
      testId: string
      value: string
    }>
  >((accumulator, metric) => {
    if (typeof metric.value === 'string' && metric.value.length > 0) {
      accumulator.push({
        ...metric,
        value: metric.value,
      })
    }

    return accumulator
  }, [])
}

export function StatusBar({
  connectionState,
  activeConnectionName,
  activeConnectionHosts,
  overview,
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
  const overviewMetrics = getOverviewMetrics(overview, t)

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

      {overviewMetrics.length > 0 ? (
        <div className="status-bar__overview" data-testid="status-overview">
          {overviewMetrics.map((metric) => (
            <OverviewMetric
              key={metric.key}
              description={metric.description}
              icon={metric.icon}
              iconName={metric.iconName}
              label={metric.label}
              testId={metric.testId}
              value={metric.value}
            />
          ))}
        </div>
      ) : null}

      <span className="status-bar__watchers">
        {t('runtime.watchers', { count: watcherCount })}
      </span>
      <span className="status-bar__message">{message ?? t('runtime.waiting')}</span>
    </div>
  )
}
