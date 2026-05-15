import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  default: (props: { value?: string }) => (
    <div data-testid="monaco-editor">{props.value ?? ''}</div>
  ),
}))

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetTreeStore } from '../../src/renderer/features/tree/useTreeStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { StoredConnection } from '../../src/shared/models/connection'
import type {
  RuntimeEvent,
  TreeNodeRow,
  ZooKeeperOverview,
} from '../../src/shared/models/node'

const savedConnections: StoredConnection[] = [
  {
    id: 'local-zk',
    name: 'Local ZooKeeper',
    hosts: '192.168.171.15:2181',
    sessionTimeoutMs: 20_000,
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: '2026-05-13T08:00:00.000Z',
  },
]

const rootRows: TreeNodeRow[] = [
  {
    path: '/services',
    name: 'services',
    hasChildren: true,
    dataLength: 128,
    mtime: Date.now() - 60_000,
  },
]

describe('connection status ui', () => {
  const originalZkube = window.zkube
  const runtimeListeners = new Set<(event: RuntimeEvent) => void>()
  let getOverviewMock: ReturnType<typeof vi.fn<() => Promise<ZooKeeperOverview>>>

  beforeEach(() => {
    getOverviewMock = vi.fn<() => Promise<ZooKeeperOverview>>().mockResolvedValue({
      sourceHost: '192.168.171.15:2181',
      sourceCommand: 'mntr',
      serverState: 'follower',
      avgLatency: 0.4,
      packetsReceived: 1_076_090_343,
      packetsSent: 1_626_607_257,
      numAliveConnections: 58,
      znodeCount: 3_981,
      watchCount: 57,
      approximateDataSize: 14 * 1024 * 1024,
      collectedAt: 1_715_000_000_000,
      available: true,
      reason: null,
    })

    window.zkube = {
      app: {
        getVersion: vi.fn(),
        ping: vi.fn(),
      },
      connections: {
        list: vi.fn().mockResolvedValue(savedConnections),
        save: vi.fn(),
        exportAll: vi.fn(),
        importJson: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
      },
      zookeeper: {
        disconnect: vi.fn().mockResolvedValue(undefined),
        loadChildren: vi.fn().mockResolvedValue(rootRows),
        getOverview: getOverviewMock,
        open: vi.fn(),
        search: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn((cb: (event: RuntimeEvent) => void) => {
          runtimeListeners.add(cb)
          return vi.fn(() => {
            runtimeListeners.delete(cb)
          })
        }),
      },
    }
  })

  afterEach(() => {
    runtimeListeners.clear()
    resetConnectionsStore()
    resetTreeStore()
    resetWorkbenchStore()
    window.zkube = originalZkube
  })

  function emitRuntimeEvent(event: RuntimeEvent) {
    for (const listener of runtimeListeners) {
      listener(event)
    }
  }

  it('shows connecting first, then healthy, then supports disconnecting the active connection', async () => {
    render(<App />)

    const card = (await screen.findByText('Local ZooKeeper')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: /connect connection local zookeeper/i,
      }),
    )

    expect(window.zkube.connections.connect).toHaveBeenCalledWith('local-zk')
    expect(
      within(card as HTMLElement).getByRole('button', { name: /connection pending local zookeeper/i }),
    ).toBeDisabled()
    expect(
      within(card as HTMLElement).getByLabelText(/connection health local zookeeper/i),
    ).toHaveAttribute('data-state', 'connecting')
    expect(
      within(screen.getByLabelText('Runtime status bar')).getByText('Connecting...'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Runtime status bar')).getByText(
        'Connecting... · Local ZooKeeper / 192.168.171.15:2181',
      ),
    ).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(within(card as HTMLElement).getByText('Healthy')).toBeInTheDocument()
    expect(card).toHaveClass('connection-card--active', 'connection-card--healthy')
    expect(
      within(card as HTMLElement).getByLabelText(/connection health local zookeeper/i),
    ).toHaveAttribute('data-state', 'connected')
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: /disconnect connection local zookeeper/i,
      }),
    ).toBeInTheDocument()
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: /disconnect connection local zookeeper/i,
      }),
    ).toHaveClass('button-danger')

    const statusBar = screen.getByLabelText('Runtime status bar')
    expect(
      within(statusBar).getByText('Healthy · Local ZooKeeper / 192.168.171.15:2181'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('ZooKeeper overview strip')).not.toBeInTheDocument()
    expect(within(statusBar).getByTestId('status-overview')).toBeInTheDocument()
    expect(within(statusBar).getByText('58')).toBeInTheDocument()
    expect(within(statusBar).getByText('follower')).toBeInTheDocument()
    expect(within(statusBar).getByText('0.4ms')).toBeInTheDocument()
    expect(within(statusBar).getByText('3981')).toBeInTheDocument()
    expect(within(statusBar).getByText('1626607257')).toBeInTheDocument()
    expect(within(statusBar).getByText('1076090343')).toBeInTheDocument()
    expect(within(statusBar).getByTestId('status-overview-connections')).toHaveAttribute(
      'data-icon',
      'lucide-plug-zap',
    )
    expect(within(statusBar).getByTestId('status-overview-role')).toHaveAttribute(
      'data-icon',
      'lucide-badge-info',
    )
    expect(within(statusBar).getByTestId('status-overview-latency')).toHaveAttribute(
      'data-icon',
      'lucide-gauge',
    )
    expect(within(statusBar).getByTestId('status-overview-znodes')).toHaveAttribute(
      'data-icon',
      'lucide-network',
    )
    expect(within(statusBar).getByTestId('status-overview-packets-tx')).toHaveAttribute(
      'data-icon',
      'lucide-arrow-up-from-line',
    )
    expect(within(statusBar).getByTestId('status-overview-packets-rx')).toHaveAttribute(
      'data-icon',
      'lucide-arrow-down-to-line',
    )
    expect(
      within(statusBar)
        .getByTestId('status-overview-packets-tx')
        .parentElement,
    ).toHaveAttribute(
      'title',
      'Packets TX: 1626607257. Total ZooKeeper protocol packets sent by this server.',
    )
    expect(
      within(statusBar)
        .getByTestId('status-overview-packets-rx')
        .parentElement,
    ).toHaveAttribute(
      'title',
      'Packets RX: 1076090343. Total ZooKeeper protocol packets received by this server.',
    )
    expect(within(statusBar).queryByText(/from 192\.168\.171\.15:2181/i)).not.toBeInTheDocument()
    expect(within(statusBar).queryByText(/Limited metrics/i)).not.toBeInTheDocument()

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: /disconnect connection local zookeeper/i,
      }),
    )

    expect(window.zkube.zookeeper.disconnect).toHaveBeenCalledTimes(1)

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'disconnected',
      })
    })

    await waitFor(() => {
      expect(
        within(card as HTMLElement).getByRole('button', {
          name: /connect connection local zookeeper/i,
        }),
      ).toBeInTheDocument()
    })
    expect(card).not.toHaveClass('connection-card--active', 'connection-card--healthy')
    expect(within(card as HTMLElement).queryByText('Healthy')).not.toBeInTheDocument()
    expect(within(statusBar).queryByText(/192\.168\.171\.15:2181/i)).not.toBeInTheDocument()
    expect(within(statusBar).queryByTestId('status-overview')).not.toBeInTheDocument()
  })

  it('keeps overview fallback details out of the status bar when srvr/stat is used', async () => {
    getOverviewMock.mockResolvedValueOnce({
      sourceHost: '192.168.171.15:2181',
      sourceCommand: 'srvr',
      serverState: 'follower',
      avgLatency: 18,
      packetsReceived: 91,
      packetsSent: 77,
      numAliveConnections: 12,
      znodeCount: 433,
      watchCount: null,
      approximateDataSize: null,
      collectedAt: 1_715_000_000_000,
      available: true,
      reason: null,
    })

    render(<App />)

    const card = (await screen.findByText('Local ZooKeeper')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: /connect connection local zookeeper/i,
      }),
    )

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    const statusBar = screen.getByLabelText('Runtime status bar')
    expect(within(statusBar).getByText('follower')).toBeInTheDocument()
    expect(within(statusBar).getByText('12')).toBeInTheDocument()
    expect(within(statusBar).queryByText(/Limited metrics/i)).not.toBeInTheDocument()
    expect(within(statusBar).queryByText(/from 192\.168\.171\.15:2181/i)).not.toBeInTheDocument()
  })

  it('restores the connect action when connecting fails', async () => {
    window.zkube.connections.connect = vi
      .fn()
      .mockRejectedValue(new Error('Connect failed'))

    render(<App />)

    const card = (await screen.findByText('Local ZooKeeper')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: /connect connection local zookeeper/i,
      }),
    )

    expect(await screen.findByText('Connect failed')).toBeInTheDocument()
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: /connect connection local zookeeper/i,
      }),
    ).toBeEnabled()
    expect(within(card as HTMLElement).queryByText('Healthy')).not.toBeInTheDocument()
  })

  it('shows a disconnect notice dialog when a connected session drops unexpectedly', async () => {
    render(<App />)

    const card = (await screen.findByText('Local ZooKeeper')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: /connect connection local zookeeper/i,
      }),
    )

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'disconnected',
      })
    })

    expect(
      await screen.findByRole('dialog', { name: 'Connection lost' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The active ZooKeeper connection was lost.'),
    ).toBeInTheDocument()
    expect(card).not.toHaveClass('connection-card--active', 'connection-card--healthy')
    expect(
      within(screen.getByLabelText('Runtime status bar')).queryByText(
        /192\.168\.171\.15:2181/i,
      ),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(
      screen.queryByRole('dialog', { name: 'Connection lost' }),
    ).not.toBeInTheDocument()
  })
})
