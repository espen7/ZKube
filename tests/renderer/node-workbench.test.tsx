import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const monacoEditorSpy = vi.hoisted(() => vi.fn())

vi.mock('@monaco-editor/react', () => ({
  default: (props: {
    value?: string
    onChange?: (value?: string) => void
    options?: { readOnly?: boolean }
  }) => {
    monacoEditorSpy(props)

    return (
      <textarea
        aria-label="Node data editor"
        data-testid="monaco-editor"
        readOnly={Boolean(props.options?.readOnly)}
        value={props.value ?? ''}
        onChange={(event) => props.onChange?.(event.target.value)}
      />
    )
  },
}))

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetTreeStore } from '../../src/renderer/features/tree/useTreeStore'
import { formatJson, formatXml } from '../../src/renderer/features/workbench/formatters'
import { useWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { StoredConnection } from '../../src/shared/models/connection'
import type { NodeMarkColor } from '../../src/shared/models/node'
import type { NodeSnapshot, RuntimeEvent } from '../../src/shared/models/node'
import type { TreeNodeRow } from '../../src/shared/models/node'
import type { ZooKeeperOverview } from '../../src/shared/models/node'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

describe('node workbench formatters', () => {
  it('formats JSON with two-space indentation', () => {
    expect(formatJson('{"service":"zk","enabled":true}')).toBe(
      '{\n  "service": "zk",\n  "enabled": true\n}',
    )
  })

  it('adds line breaks for sibling XML tags', () => {
    expect(formatXml('<root><item>1</item><item>2</item></root>')).toBe(
      '<root>\n<item>1</item>\n<item>2</item>\n</root>',
    )
  })
})

describe('node workbench', () => {
  const originalZkube = window.zkube
  let openMock: ReturnType<typeof vi.fn<(path: string) => Promise<NodeSnapshot>>>
  let updateMock: ReturnType<
    typeof vi.fn<
      (path: string, data: Uint8Array, version?: number) => Promise<void>
    >
  >
  const runtimeListeners = new Set<(event: RuntimeEvent) => void>()
  let connectionsListMock: ReturnType<typeof vi.fn>
  let connectMock: ReturnType<typeof vi.fn<(connectionId: string) => Promise<void>>>
  let nodeMarksListMock: ReturnType<typeof vi.fn>
  let nodeMarksClearMock: ReturnType<
    typeof vi.fn<
      (connectionId: string, path: string, recursive?: boolean) => Promise<void>
    >
  >
  let loadChildrenMock: ReturnType<
    typeof vi.fn<(path: string) => Promise<TreeNodeRow[]>>
  >
  let getOverviewMock: ReturnType<
    typeof vi.fn<() => Promise<ZooKeeperOverview>>
  >
  let saveAclMock: ReturnType<
    typeof vi.fn<
      (path: string, acl: NodeSnapshot['acl']) => Promise<void>
    >
  >

  beforeEach(() => {
    monacoEditorSpy.mockClear()
    openMock = vi.fn<(path: string) => Promise<NodeSnapshot>>().mockResolvedValue({
      path: '/config/service',
      data: new TextEncoder().encode('{"service":"zk"}'),
      stat: {
        version: 7,
        numChildren: 2,
        mtime: 1_715_000_000_000,
        dataLength: 16,
      },
      acl: [],
    })
    updateMock = vi
      .fn<(path: string, data: Uint8Array, version?: number) => Promise<void>>()
      .mockResolvedValue(undefined)
    connectionsListMock = vi.fn().mockResolvedValue([] satisfies StoredConnection[])
    connectMock = vi.fn<(connectionId: string) => Promise<void>>().mockResolvedValue(undefined)
    nodeMarksListMock = vi.fn().mockResolvedValue({} satisfies Record<string, NodeMarkColor>)
    nodeMarksClearMock = vi
      .fn<(connectionId: string, path: string, recursive?: boolean) => Promise<void>>()
      .mockResolvedValue(undefined)
    loadChildrenMock = vi
      .fn<(path: string) => Promise<TreeNodeRow[]>>()
      .mockResolvedValue([])
    getOverviewMock = vi.fn<() => Promise<ZooKeeperOverview>>().mockResolvedValue({
      sourceHost: '192.168.171.15:2181',
      sourceCommand: 'mntr',
      serverState: 'leader',
      avgLatency: 51,
      packetsReceived: 290,
      packetsSent: 57,
      numAliveConnections: 14,
      znodeCount: 290,
      watchCount: 57,
      approximateDataSize: 14 * 1024 * 1024,
      collectedAt: 1_715_000_000_000,
      available: true,
      reason: null,
    })
    saveAclMock = vi
      .fn<(path: string, acl: NodeSnapshot['acl']) => Promise<void>>()
      .mockResolvedValue(undefined)

    window.zkube = {
      app: {
        getVersion: vi.fn(),
        ping: vi.fn(),
      },
      connections: {
        list: () =>
          (connectionsListMock as () => Promise<StoredConnection[]>)(),
        save: vi.fn(),
        exportAll: vi.fn(),
        importJson: vi.fn(),
        connect: (connectionId: string) => connectMock(connectionId),
        importFromFile: vi.fn(),
        exportToFile: vi.fn(),
        delete: vi.fn(),
      },
      nodeMarks: {
        list: (connectionId: string) =>
          (
            nodeMarksListMock as (
              connectionId: string,
            ) => Promise<Record<string, NodeMarkColor>>
          )(connectionId),
        set: vi.fn(),
        clear: (connectionId: string, path: string, recursive?: boolean) =>
          nodeMarksClearMock(connectionId, path, recursive),
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: loadChildrenMock,
        getOverview: getOverviewMock,
        open: openMock,
        search: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        delete: vi.fn(),
        update: updateMock,
        saveAcl: saveAclMock,
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

  afterEach(async () => {
    const workbenchModule = await import('../../src/renderer/stores/useWorkbenchStore')
    workbenchModule.resetWorkbenchStore()
    resetConnectionsStore()
    resetTreeStore()
    runtimeListeners.clear()
    window.zkube = originalZkube
  })

  function emitRuntimeEvent(event: RuntimeEvent) {
    for (const listener of runtimeListeners) {
      listener(event)
    }
  }

  async function openNode(path = '/config/service') {
    await act(async () => {
      useWorkbenchStore.getState().openNode(path)
    })
  }

  it('renders an empty workbench before any node is opened', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(screen.getByRole('heading', { name: 'MARK NODE' })).toBeInTheDocument()
    expect(
      screen.getByText('No marked nodes for this connection.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Open a node from the tree or search results to start editing.'),
    ).toBeInTheDocument()
    expect(openMock).not.toHaveBeenCalled()
  })

  it('mounts the monaco editor and switches between data/meta/acl panes', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    expect(openMock).toHaveBeenCalledWith('/config/service')
    expect(await screen.findByTestId('monaco-editor')).toHaveValue(
      '{"service":"zk"}',
    )
    expect(monacoEditorSpy).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Meta' }))
    const metaPane = await screen.findByLabelText('Node meta pane')
    expect(within(metaPane).getByText('7')).toBeInTheDocument()
    expect(within(metaPane).getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ACL' }))
    expect(
      screen.getByRole('checkbox', { name: 'read' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Data' }))
    expect(screen.getByTestId('monaco-editor')).toHaveValue('{"service":"zk"}')
  })

  it('merges the inspector summary into the meta pane for the active node', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    fireEvent.click(screen.getByRole('button', { name: 'Meta' }))
    const metaPane = screen.getByLabelText('Node meta pane')

    expect(within(metaPane).getByText('/config/service')).toBeInTheDocument()
    expect(within(metaPane).getByText('7')).toBeInTheDocument()
    expect(within(metaPane).getByText('2')).toBeInTheDocument()
    expect(within(metaPane).getByText('16 B')).toBeInTheDocument()
    expect(
      within(metaPane).getByText(new Date(1_715_000_000_000).toLocaleString()),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Node Inspector' })).not.toBeInTheDocument()
  })

  it('renders the node editor with a compact path label and action buttons below the editor', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    const pane = screen.getByLabelText('Node data pane')
    const pathLabel = within(pane).getByRole('heading', { name: '/config/service' })
    const editorBody = within(pane).getByTestId('node-editor-body')
    const editor = within(editorBody).getByTestId('monaco-editor')
    const actions = within(editorBody).getByTestId('node-editor-actions')

    expect(pathLabel).toHaveClass('node-editor__path')
    expect(actions.compareDocumentPosition(editor)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })

  it('does not allow saving a world:anyone acl when the record is absent', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    fireEvent.click(screen.getByRole('button', { name: 'ACL' }))

    expect(
      await screen.findByText('This node does not expose a `world:anyone` ACL record.'),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Save ACL' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'read' })).toBeDisabled()
    expect(saveAclMock).not.toHaveBeenCalled()
  })

  it('saves the world:anyone acl entry from the acl pane', async () => {
    openMock.mockResolvedValueOnce({
      path: '/config/service',
      data: new TextEncoder().encode('{"service":"zk"}'),
      stat: {
        version: 7,
        numChildren: 2,
        mtime: 1_715_000_000_000,
        dataLength: 16,
      },
      acl: [
        {
          scheme: 'world',
          id: 'anyone',
          permissions: ['read'],
        },
      ],
    })

    await act(async () => {
      render(<App />)
    })

    await openNode()

    fireEvent.click(screen.getByRole('button', { name: 'ACL' }))

    const writeCheckbox = await screen.findByRole('checkbox', { name: 'write' })
    fireEvent.click(writeCheckbox)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save ACL' }))
    })

    expect(saveAclMock).toHaveBeenCalledWith('/config/service', [
      {
        scheme: 'world',
        id: 'anyone',
        permissions: ['read', 'write'],
      },
    ])
  })

  it('stops retrying after the initial open failure', async () => {
    openMock.mockRejectedValueOnce(new Error('boom'))

    await act(async () => {
      render(<App />)
    })

    await openNode()

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')

    await act(async () => {
      await Promise.resolve()
    })

    expect(openMock).toHaveBeenCalledTimes(1)
  })

  it('recovers node loading after a connected runtime event', async () => {
    openMock.mockRejectedValueOnce(new Error('boom'))

    await act(async () => {
      render(<App />)
    })

    await openNode()

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    expect(openMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(await screen.findByTestId('monaco-editor')).toHaveValue(
      '{"service":"zk"}',
    )
    expect(openMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the monaco editor read-only while the initial load is pending', async () => {
    const deferred = createDeferred<NodeSnapshot>()
    openMock.mockReturnValueOnce(deferred.promise)

    await act(async () => {
      render(<App />)
    })

    await openNode()

    const editor = await screen.findByTestId('monaco-editor')
    expect(editor).toHaveProperty('readOnly', true)
  })

  it('increments the node version across consecutive saves', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    const editor = await screen.findByTestId('monaco-editor')

    fireEvent.change(editor, {
      target: { value: '{"service":"zk","enabled":true}' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Format JSON' }))
    expect(editor).toHaveValue('{\n  "service": "zk",\n  "enabled": true\n}')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    fireEvent.change(editor, {
      target: { value: '{"service":"zk","enabled":false}' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(updateMock).toHaveBeenNthCalledWith(
      1,
      '/config/service',
      new TextEncoder().encode('{\n  "service": "zk",\n  "enabled": true\n}'),
      7,
    )
    expect(updateMock).toHaveBeenNthCalledWith(
      2,
      '/config/service',
      new TextEncoder().encode('{"service":"zk","enabled":false}'),
      8,
    )
  })

  it('shows a dedicated version-conflict message when ZooKeeper rejects the save with BAD_VERSION', async () => {
    updateMock.mockRejectedValueOnce(
      Object.assign(new Error('stale version'), { code: 'BAD_VERSION' }),
    )

    await act(async () => {
      render(<App />)
    })

    await openNode()

    const editor = await screen.findByTestId('monaco-editor')
    fireEvent.change(editor, {
      target: { value: '{"service":"dirty"}' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This node was updated elsewhere. Refresh the node and review the latest data before saving again.',
    )
    expect(editor).toHaveValue('{"service":"dirty"}')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('keeps non-version save failures on the generic error path', async () => {
    updateMock.mockRejectedValueOnce(new Error('Connection lost during save'))

    await act(async () => {
      render(<App />)
    })

    await openNode()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Connection lost during save',
    )
  })

  it('refreshes the active node from the workbench header action', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    openMock.mockResolvedValueOnce({
      path: '/config/service',
      data: new TextEncoder().encode('{"service":"refreshed"}'),
      stat: {
        version: 8,
        numChildren: 3,
        mtime: 1_715_200_000_000,
        dataLength: 23,
      },
      acl: [],
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh node' }))
    })

    expect(openMock).toHaveBeenCalledTimes(2)
    expect(await screen.findByTestId('monaco-editor')).toHaveValue(
      '{"service":"refreshed"}',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Meta' }))
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows current-connection marked nodes in the workbench header and opens them on click', async () => {
    connectionsListMock.mockResolvedValueOnce([
      {
        id: 'readonly-1',
        name: 'Readonly',
        hosts: '192.168.171.15:2181',
        updatedAt: '2026-05-14T10:00:00.000Z',
      },
    ])
    nodeMarksListMock.mockResolvedValueOnce({
      '/config/service': 'red',
      '/config/service/child': 'green',
    })
    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          {
            path: '/config',
            name: 'config',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config') {
        return [
          {
            path: '/config/service',
            name: 'service',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config/service') {
        return [
          {
            path: '/config/service/child',
            name: 'child',
            hasChildren: false,
            dataLength: 10,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      return []
    })

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(
      await screen.findByRole('button', { name: /connect connection readonly/i }),
    )

    expect(await screen.findByRole('button', { name: '/config/service' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '/config/service/child' })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '/config/service/child' }))
    })

    expect(openMock).toHaveBeenCalledWith('/config/service/child')
  })

  it('removes the ZooKeeper overview strip from the workbench header', async () => {
    connectionsListMock.mockResolvedValueOnce([
      {
        id: 'readonly-1',
        name: 'Readonly',
        hosts: '192.168.171.15:2181',
        updatedAt: '2026-05-14T10:00:00.000Z',
      },
    ])

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(
      await screen.findByRole('button', { name: /connect connection readonly/i }),
    )

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(screen.queryByLabelText('ZooKeeper overview strip')).not.toBeInTheDocument()
  })

  it('reveals the marked node inside the tree and scrolls it into view when clicked', async () => {
    const scrollIntoViewMock = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewMock

    connectionsListMock.mockResolvedValueOnce([
      {
        id: 'readonly-1',
        name: 'Readonly',
        hosts: '192.168.171.15:2181',
        updatedAt: '2026-05-14T10:00:00.000Z',
      },
    ])
    nodeMarksListMock.mockResolvedValueOnce({
      '/config/service/child': 'green',
    })
    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          {
            path: '/config',
            name: 'config',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config') {
        return [
          {
            path: '/config/service',
            name: 'service',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config/service') {
        return [
          {
            path: '/config/service/child',
            name: 'child',
            hasChildren: false,
            dataLength: 10,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      return []
    })

    try {
      await act(async () => {
        render(<App />)
      })

      fireEvent.click(
        await screen.findByRole('button', { name: /connect connection readonly/i }),
      )

      await act(async () => {
        fireEvent.click(
          await screen.findByRole('button', { name: '/config/service/child' }),
        )
      })

      expect(loadChildrenMock).toHaveBeenCalledWith('/')
      expect(loadChildrenMock).toHaveBeenCalledWith('/config')
      expect(loadChildrenMock).toHaveBeenCalledWith('/config/service')
      const treeRegion = screen.getByLabelText('Tree content region')
      expect(
        await within(treeRegion).findByTitle('/config/service/child'),
      ).toBeInTheDocument()
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: 'center',
        inline: 'nearest',
      })
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('removes a local mark from the marked nodes list via context menu', async () => {
    connectionsListMock.mockResolvedValueOnce([
      {
        id: 'readonly-1',
        name: 'Readonly',
        hosts: '192.168.171.15:2181',
        updatedAt: '2026-05-14T10:00:00.000Z',
      },
    ])
    nodeMarksListMock.mockResolvedValueOnce({
      '/config/service': 'red',
    })

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(
      await screen.findByRole('button', { name: /connect connection readonly/i }),
    )

    const markedNode = await screen.findByRole('button', {
      name: '/config/service',
    })

    fireEvent.contextMenu(markedNode)

    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Remove mark' }))
    })

    expect(nodeMarksClearMock).toHaveBeenCalledWith(
      'readonly-1',
      '/config/service',
      false,
    )
    expect(
      screen.queryByRole('button', { name: '/config/service' }),
    ).not.toBeInTheDocument()
  })

  it('shows a missing-node message instead of jumping when a marked node no longer exists', async () => {
    connectionsListMock.mockResolvedValueOnce([
      {
        id: 'readonly-1',
        name: 'Readonly',
        hosts: '192.168.171.15:2181',
        updatedAt: '2026-05-14T10:00:00.000Z',
      },
    ])
    nodeMarksListMock.mockResolvedValueOnce({
      '/config/service/child': 'green',
    })
    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          {
            path: '/config',
            name: 'config',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config') {
        return [
          {
            path: '/config/service',
            name: 'service',
            hasChildren: true,
            dataLength: 0,
            mtime: Date.now() - 60_000,
          },
        ]
      }

      if (path === '/config/service') {
        return []
      }

      return []
    })

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(
      await screen.findByRole('button', { name: /connect connection readonly/i }),
    )

    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: '/config/service/child' }),
      )
    })

    expect(openMock).not.toHaveBeenCalled()
    expect(
      await screen.findByText(
        'This marked node no longer exists in ZooKeeper. Remove the mark or refresh the tree.',
      ),
    ).toBeInTheDocument()
  })

  it('confirms before refreshing when the active node has unsaved draft changes', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()

    fireEvent.change(await screen.findByTestId('monaco-editor'), {
      target: { value: '{"service":"dirty"}' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Refresh node' }))

    expect(
      screen.getByRole('dialog', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument()
    expect(openMock).toHaveBeenCalledTimes(1)

    openMock.mockResolvedValueOnce({
      path: '/config/service',
      data: new TextEncoder().encode('{"service":"clean"}'),
      stat: {
        version: 9,
        numChildren: 2,
        mtime: 1_715_200_100_000,
        dataLength: 19,
      },
      acl: [],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Discard and refresh' }))

    expect(await screen.findByTestId('monaco-editor')).toHaveValue(
      '{"service":"clean"}',
    )
    expect(screen.queryByRole('dialog', { name: 'Discard unsaved changes?' })).not.toBeInTheDocument()
  })

  it('clears old workbench tabs on connection changes and prevents saving stale paths', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode()
    expect(await screen.findByTestId('monaco-editor')).toHaveValue(
      '{"service":"zk"}',
    )

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{"service":"old-cluster"}' },
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'reconnecting',
      })
    })

    expect(
      screen.getByText('Open a node from the tree or search results to start editing.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '/config/service' })).not.toBeInTheDocument()
    expect(useWorkbenchStore.getState().activePath).toBeNull()
    expect(useWorkbenchStore.getState().tabs).toHaveLength(0)

    await act(async () => {
      await useWorkbenchStore.getState().saveTab('/config/service')
    })

    expect(updateMock).not.toHaveBeenCalled()
  })

  it('ignores stale node loads that finish after the connection changes', async () => {
    const deferred = createDeferred<NodeSnapshot>()
    openMock.mockReturnValueOnce(deferred.promise)

    await act(async () => {
      render(<App />)
    })

    await openNode('/services/api')

    expect(await screen.findByTestId('monaco-editor')).toHaveProperty('readOnly', true)

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'reconnecting',
      })
    })

    await act(async () => {
      deferred.resolve({
        path: '/services/api',
        data: new TextEncoder().encode('{"service":"stale"}'),
        stat: {
          version: 4,
          numChildren: 1,
          mtime: 1_715_100_000_000,
          dataLength: 19,
        },
        acl: [],
      })
    })

    expect(
      screen.getByText('Open a node from the tree or search results to start editing.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '/services/api' })).not.toBeInTheDocument()
    expect(useWorkbenchStore.getState().tabs).toHaveLength(0)
  })

  it('closes tabs for a deleted subtree when a nodeDeleted runtime event arrives', async () => {
    await act(async () => {
      render(<App />)
    })

    await openNode('/services')
    await openNode('/services/api')

    expect(useWorkbenchStore.getState().tabs.map((tab) => tab.path)).toEqual([
      '/services',
      '/services/api',
    ])

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeDeleted',
        path: '/services',
      })
    })

    expect(useWorkbenchStore.getState().tabs).toHaveLength(0)
    expect(useWorkbenchStore.getState().activePath).toBeNull()
    expect(
      screen.getByText('Open a node from the tree or search results to start editing.'),
    ).toBeInTheDocument()
  })
})
