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
import type { RuntimeEvent } from '../../src/shared/models/node'

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

describe('connection status ui', () => {
  const originalZkube = window.zkube
  const runtimeListeners = new Set<(event: RuntimeEvent) => void>()

  beforeEach(() => {
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
        loadChildren: vi.fn().mockResolvedValue([]),
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
    expect(within(screen.getByLabelText('Runtime status bar')).getByText('Connecting...')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(within(card as HTMLElement).getByText('Healthy')).toBeInTheDocument()
    expect(
      within(card as HTMLElement).getByLabelText(/connection health local zookeeper/i),
    ).toHaveAttribute('data-state', 'connected')
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: /disconnect connection local zookeeper/i,
      }),
    ).toBeInTheDocument()

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
    expect(within(card as HTMLElement).queryByText('Healthy')).not.toBeInTheDocument()
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
})
