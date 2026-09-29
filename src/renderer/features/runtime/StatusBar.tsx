import type { ConnectionState, ZooKeeperOverview } from '../../../shared/models/node'
import { MaterialSymbol } from '../../components/MaterialSymbol'
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
  iconName: string
  label: string
  testId: string
  value: string
}

type OverviewMetricDefinition = {
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

function OverviewMetric({
  description,
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
        data-icon={`sym-${iconName}`}
        data-testid={testId}
      >
        <MaterialSymbol name={iconName} size={16} />
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
      iconName: 'link',
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
      iconName: 'dns',
      testId: 'status-overview-role',
    },
    {
      key: 'latency',
      label: t('workbench.overviewLatency'),
      description: t('workbench.overviewLatencyDescription'),
      value: formatLatency(overview.avgLatency),
      iconName: 'speed',
      testId: 'status-overview-latency',
    },
    {
      key: 'znodes',
      label: t('workbench.overviewZnodes'),
      description: t('workbench.overviewZnodesDescription'),
      value: formatCount(overview.znodeCount),
      iconName: 'account_tree',
      testId: 'status-overview-znodes',
    },
    {
      key: 'packets-tx',
      label: t('workbench.overviewPacketsTx'),
      description: t('workbench.overviewPacketsTxDescription'),
      value: formatCount(overview.packetsSent),
      iconName: 'upload',
      testId: 'status-overview-packets-tx',
    },
    {
      key: 'packets-rx',
      label: t('workbench.overviewPacketsRx'),
      description: t('workbench.overviewPacketsRxDescription'),
      value: formatCount(overview.packetsReceived),
      iconName: 'download',
      testId: 'status-overview-packets-rx',
    },
  ]

  return metrics.reduce<
    Array<{
      description?: string
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
