import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const monacoEditorSpy = vi.hoisted(() => vi.fn())

vi.mock('@monaco-editor/react', () => ({
  default: (props: { value?: string }) => {
    monacoEditorSpy(props)
    return <div data-testid="monaco-editor">{props.value ?? ''}</div>
  },
}))

import App from '../../src/renderer/App'
import { StatusBar } from '../../src/renderer/features/runtime/StatusBar'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetTreeStore } from '../../src/renderer/features/tree/useTreeStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { RuntimeEvent } from '../../src/shared/models/node'

describe('runtime feedback', () => {
  const originalZkube = window.zkube
  const runtimeListeners = new Set<(event: RuntimeEvent) => void>()

  beforeEach(() => {
    monacoEditorSpy.mockClear()

    window.zkube = {
      app: {
        getVersion: vi.fn(),
        ping: vi.fn(),
      },
      connections: {
        list: vi.fn().mockResolvedValue([]),
        save: vi.fn(),
        exportAll: vi.fn(),
        importJson: vi.fn(),
        connect: vi.fn(),
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: vi.fn().mockResolvedValue([]),
        open: vi.fn().mockResolvedValue({
          path: '/config/service',
          data: new TextEncoder().encode('{"service":"zk"}'),
          stat: {
            version: 1,
            numChildren: 0,
          },
          acl: [],
        }),
        search: vi.fn().mockResolvedValue([]),
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

  it('renders the status bar snapshot', () => {
    render(
      <StatusBar
        connectionState="connected"
        watcherCount={3}
        message="Children changed: /services"
      />,
    )

    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('watchers: 3')).toBeInTheDocument()
    expect(screen.getByText('Children changed: /services')).toBeInTheDocument()
  })

  it('updates the footer and toast region when runtime events arrive', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(runtimeListeners.size).toBeGreaterThan(1)

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    const statusBar = screen.getByLabelText('Runtime status bar')
    expect(within(statusBar).getByText('Healthy')).toBeInTheDocument()
    expect(within(statusBar).getByText('watchers: 0')).toBeInTheDocument()
    expect(within(statusBar).getByText('Connection healthy')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeDeleted',
        path: '/services/api',
      })
    })

    expect(within(statusBar).getByText('watchers: 1')).toBeInTheDocument()
    expect(within(statusBar).getByText('Node deleted: /services/api')).toBeInTheDocument()
    expect(screen.queryByLabelText('Runtime toast region')).not.toBeInTheDocument()
  })
})
