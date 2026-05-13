import { act, fireEvent, render, screen } from '@testing-library/react'
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
import { formatJson, formatXml } from '../../src/renderer/features/workbench/formatters'
import { useWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { NodeSnapshot, RuntimeEvent } from '../../src/shared/models/node'

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
      },
      acl: [],
    })
    updateMock = vi
      .fn<(path: string, data: Uint8Array, version?: number) => Promise<void>>()
      .mockResolvedValue(undefined)
    saveAclMock = vi
      .fn<(path: string, acl: NodeSnapshot['acl']) => Promise<void>>()
      .mockResolvedValue(undefined)

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
    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ACL' }))
    expect(
      screen.getByRole('checkbox', { name: 'read' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Data' }))
    expect(screen.getByTestId('monaco-editor')).toHaveValue('{"service":"zk"}')
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
})
