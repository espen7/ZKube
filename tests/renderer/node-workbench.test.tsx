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

  it('mounts the monaco editor and switches between data/meta/acl panes', async () => {
    await act(async () => {
      render(<App />)
    })

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

    const editor = await screen.findByTestId('monaco-editor')
    expect(editor).toHaveProperty('readOnly', true)
  })

  it('increments the node version across consecutive saves', async () => {
    await act(async () => {
      render(<App />)
    })

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
})
