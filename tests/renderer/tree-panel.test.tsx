import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { TreeNodeRow } from '../../src/shared/models/node'

function createRow(
  path: string,
  options: Partial<Omit<TreeNodeRow, 'path' | 'name'>> = {},
): TreeNodeRow {
  const segments = path.split('/').filter(Boolean)
  return {
    path,
    name: segments.at(-1) ?? '/',
    hasChildren: false,
    dataLength: 0,
    mtime: Date.now() - 60_000,
    ...options,
  }
}

describe('Tree panel', () => {
  const originalZkube = window.zkube
  const runtimeListeners = new Set<
    (event: {
      type: string
      path?: string
      state?: 'connected' | 'disconnected' | 'reconnecting'
    }) => void
  >()
  let loadChildrenMock: ReturnType<
    typeof vi.fn<(path: string) => Promise<TreeNodeRow[]>>
  >
  let searchMock: ReturnType<typeof vi.fn<(query: string) => Promise<string[]>>>
  let createMock: ReturnType<
    typeof vi.fn<(path: string, data: Uint8Array) => Promise<void>>
  >
  let deleteMock: ReturnType<
    typeof vi.fn<
      (
        path: string,
        options?: { version?: number; recursive?: boolean },
      ) => Promise<void>
    >
  >
  let nodeMarksListMock: ReturnType<
    typeof vi.fn<(connectionId: string) => Promise<Record<string, 'red' | 'orange' | 'yellow' | 'green'>>>
  >
  let nodeMarksSetMock: ReturnType<
    typeof vi.fn<
      (
        connectionId: string,
        path: string,
        color: 'red' | 'orange' | 'yellow' | 'green',
      ) => Promise<void>
    >
  >
  let nodeMarksClearMock: ReturnType<
    typeof vi.fn<
      (connectionId: string, path: string, recursive?: boolean) => Promise<void>
    >
  >
  let openMock: ReturnType<
    typeof vi.fn<
      (path: string) => Promise<{
        path: string
        data: Uint8Array
        stat: {
          version: number
          numChildren: number
          mtime: number | null
          dataLength: number | null
        }
        acl: []
      }>
    >
  >

  beforeEach(() => {
    loadChildrenMock = vi
      .fn<(path: string) => Promise<TreeNodeRow[]>>()
      .mockImplementation(async (path: string) => {
        if (path === '/') {
          return [
            createRow('/configs', { dataLength: 512, mtime: Date.now() - 15_000 }),
            createRow('/services', {
              hasChildren: true,
              dataLength: 2_048,
              mtime: Date.now() - 120_000,
            }),
          ]
        }

        if (path === '/services') {
          return [
            createRow('/services/api', { dataLength: 99, mtime: Date.now() - 45_000 }),
            createRow('/services/web', { dataLength: 10, mtime: Date.now() - 30_000 }),
          ]
        }

        return []
      })
    searchMock = vi
      .fn<(query: string) => Promise<string[]>>()
      .mockResolvedValue(['/services/api/live'])
    createMock = vi
      .fn<(path: string, data: Uint8Array) => Promise<void>>()
      .mockResolvedValue(undefined)
    deleteMock = vi
      .fn<
        (
          path: string,
          options?: { version?: number; recursive?: boolean },
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined)
    nodeMarksListMock = vi.fn().mockResolvedValue({})
    nodeMarksSetMock = vi.fn().mockResolvedValue(undefined)
    nodeMarksClearMock = vi.fn().mockResolvedValue(undefined)
    openMock = vi.fn<(path: string) => Promise<{
      path: string
      data: Uint8Array
      stat: {
        version: number
        numChildren: number
        mtime: number | null
        dataLength: number | null
      }
      acl: []
    }>>().mockImplementation(async (path: string) => ({
      path,
      data: new TextEncoder().encode(`opened:${path}`),
      stat: {
        version: 1,
        numChildren: 0,
        mtime: Date.now() - 30_000,
        dataLength: `opened:${path}`.length,
      },
      acl: [],
    }))

    window.zkube = {
      app: {
        getVersion: vi.fn(),
        ping: vi.fn(),
      },
      connections: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'readonly',
            name: 'Readonly',
            hosts: '192.168.171.15:2181',
            createdAt: '2026-05-13T00:00:00.000Z',
            updatedAt: '2026-05-13T00:00:00.000Z',
          },
        ]),
        save: vi.fn(),
        exportAll: vi.fn(),
        importJson: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
      },
      preferences: {
        getTheme: vi.fn().mockResolvedValue({
          theme: 'dark',
          language: 'en',
          fontSize: 'medium',
        }),
        setTheme: vi.fn().mockResolvedValue({
          theme: 'dark',
          language: 'en',
          fontSize: 'medium',
        }),
        openSettingsWindow: vi.fn().mockResolvedValue(undefined),
        subscribeTheme: vi.fn(() => vi.fn()),
      },
      nodeMarks: {
        list: nodeMarksListMock,
        set: nodeMarksSetMock,
        clear: nodeMarksClearMock,
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: loadChildrenMock,
        open: openMock,
        search: searchMock,
        create: createMock,
        delete: deleteMock,
        update: vi.fn(),
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn((cb) => {
          runtimeListeners.add(cb)
          return vi.fn(() => {
            runtimeListeners.delete(cb)
          })
        }),
      },
    }
  })

  afterEach(async () => {
    resetConnectionsStore()
    resetWorkbenchStore()

    try {
      const treeModulePath =
        '../../src/renderer/features/tree/' + 'useTreeStore'
      const treeModule = await import(treeModulePath)
      treeModule.resetTreeStore()
    } catch {
      // Tree store is introduced by this task.
    }

    runtimeListeners.clear()
    window.zkube = originalZkube
  })

  function emitRuntimeEvent(event: {
    type: string
    path?: string
    state?: 'connected' | 'disconnected' | 'reconnecting'
  }) {
    for (const listener of runtimeListeners) {
      listener(event)
    }
  }

  it('lazy loads root nodes and filters loaded entries locally', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Load root nodes' }),
      )
    })

    expect(loadChildrenMock).toHaveBeenCalledWith('/')
    expect(await screen.findByRole('columnheader', { name: 'Node' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument()
    expect(await screen.findByText('configs')).toBeInTheDocument()
    expect(screen.getByText('services')).toBeInTheDocument()
    expect(screen.queryByText('/configs')).not.toBeInTheDocument()
    expect(screen.getByTitle('/configs')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'serv' },
    })

    expect(screen.getByText('services')).toBeInTheDocument()
    expect(screen.queryByText('configs')).not.toBeInTheDocument()
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('expands a loaded child by requesting the absolute child path', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(loadChildrenMock).toHaveBeenCalledWith('/services')
    expect(await screen.findByText('api')).toBeInTheDocument()
  })

  it('runs deep search without rendering the old demo create/delete buttons', async () => {
    await act(async () => {
      render(<App />)
    })

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Deep search' }),
      )
    })

    expect(searchMock).toHaveBeenCalledWith('live')
    expect(await screen.findByText('/services/api/live')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Demo create' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Demo delete' }),
    ).not.toBeInTheDocument()
  })

  it('opens a loaded tree node in the workbench using the clicked path', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Load root nodes' }),
      )
    })

    const servicesLabel = await screen.findByText('services')
    const servicesRow = servicesLabel.closest('li')

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', {
          name: 'Open node /services',
        }),
      )
    })

    expect(openMock).toHaveBeenCalledWith('/services')
    expect(openMock).not.toHaveBeenCalledWith('/config/service')
  })

  it('opens a node when clicking the whole compact row, not just the text label', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const rowLabel = await screen.findByText('services')
    const row = rowLabel.closest('.tree-row')

    expect(row).toBeTruthy()

    await act(async () => {
      fireEvent.click(row as HTMLElement)
    })

    expect(openMock).toHaveBeenCalledWith('/services')
  })

  it('opens a deep-search result in the workbench using the result path', async () => {
    await act(async () => {
      render(<App />)
    })

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Deep search' }),
      )
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: '/services/api/live',
        }),
      )
    })

    expect(openMock).toHaveBeenCalledWith('/services/api/live')
    expect(openMock).not.toHaveBeenCalledWith('/config/service')
  })

  it('keeps only the latest deep-search results when requests resolve out of order', async () => {
    let resolveFirst: ((value: string[]) => void) | undefined
    let resolveSecond: ((value: string[]) => void) | undefined

    searchMock = vi
      .fn<(query: string) => Promise<string[]>>()
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            resolveSecond = resolve
          }),
      )
    window.zkube.zookeeper.search = searchMock

    await act(async () => {
      render(<App />)
    })

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deep search' }))
    })

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'conf' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deep search' }))
    })

    await act(async () => {
      resolveSecond?.(['/configs/db'])
    })
    expect(await screen.findByText('/configs/db')).toBeInTheDocument()

    await act(async () => {
      resolveFirst?.(['/services/api/live'])
    })

    expect(screen.queryByText('/services/api/live')).not.toBeInTheDocument()
    expect(screen.getByText('/configs/db')).toBeInTheDocument()
  })

  it('ignores pending deep-search results after runtime invalidation', async () => {
    let resolveSearch: ((value: string[]) => void) | undefined

    searchMock = vi
      .fn<(query: string) => Promise<string[]>>()
      .mockImplementation(
        () =>
          new Promise<string[]>((resolve) => {
            resolveSearch = resolve
          }),
      )
    window.zkube.zookeeper.search = searchMock

    await act(async () => {
      render(<App />)
    })

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deep search' }))
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeDeleted',
        path: '/services/api/live',
      })
    })

    await act(async () => {
      resolveSearch?.(['/services/api/live'])
    })

    expect(screen.queryByText('/services/api/live')).not.toBeInTheDocument()
  })

  it('clears loaded tree state when the connection session changes', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    expect(await screen.findByText('configs')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(screen.queryByText('configs')).not.toBeInTheDocument()
    expect(
      screen.getByText('Load the root nodes first, then expand the branches you need.'),
    ).toBeInTheDocument()
  })

  it('refreshes loaded branches when runtime children change events arrive', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    expect(await screen.findByText('configs')).toBeInTheDocument()

    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          createRow('/configs', { dataLength: 512 }),
          createRow('/services', { hasChildren: true, dataLength: 2_048 }),
          createRow('/jobs', { dataLength: 3_072 }),
        ]
      }

      if (path === '/services') {
        return [
          createRow('/services/api', { dataLength: 99 }),
          createRow('/services/web', { dataLength: 10 }),
        ]
      }

      return []
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeChildrenChanged',
        path: '/',
      })
    })

    expect(await screen.findByText('jobs')).toBeInTheDocument()
  })

  it('keeps unrelated branch loads usable after runtime invalidation', async () => {
    let resolveServicesLoad: ((value: TreeNodeRow[]) => void) | undefined

    loadChildrenMock.mockImplementation((path: string) => {
      if (path === '/') {
        return Promise.resolve([
          createRow('/configs', { dataLength: 512 }),
          createRow('/services', { hasChildren: true, dataLength: 2_048 }),
        ])
      }

      if (path === '/services') {
        return new Promise<TreeNodeRow[]>((resolve) => {
          resolveServicesLoad = resolve
        })
      }

      return Promise.resolve([])
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeChildrenChanged',
        path: '/configs',
      })
    })

    await act(async () => {
      resolveServicesLoad?.([createRow('/services/api', { dataLength: 99 })])
    })

    expect(await screen.findByText('api')).toBeInTheDocument()
  })

  it('reloads recreated branches after a runtime delete event', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    let loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    let servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(await screen.findByText('api')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeDeleted',
        path: '/services',
      })
    })

    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          createRow('/configs', { dataLength: 512 }),
          createRow('/services', { hasChildren: true, dataLength: 2_048 }),
        ]
      }

      if (path === '/services') {
        return [createRow('/services/worker', { dataLength: 88 })]
      }

      return []
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeChildrenChanged',
        path: '/',
      })
    })

    loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(await screen.findByText('worker')).toBeInTheDocument()
    expect(
      loadChildrenMock.mock.calls.filter(([path]) => path === '/services'),
    ).toHaveLength(2)
  })

  it('reloads a branch when that same path changes during an in-flight load', async () => {
    let resolveFirstServicesLoad: ((value: TreeNodeRow[]) => void) | undefined
    let servicesLoadCount = 0

    loadChildrenMock.mockImplementation((path: string) => {
      if (path === '/') {
        return Promise.resolve([
          createRow('/configs', { dataLength: 512 }),
          createRow('/services', { hasChildren: true, dataLength: 2_048 }),
        ])
      }

      if (path === '/services') {
        servicesLoadCount += 1

        if (servicesLoadCount === 1) {
          return new Promise<TreeNodeRow[]>((resolve) => {
            resolveFirstServicesLoad = resolve
          })
        }

        return Promise.resolve([createRow('/services/worker', { dataLength: 88 })])
      }

      return Promise.resolve([])
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    await act(async () => {
      emitRuntimeEvent({
        type: 'nodeChildrenChanged',
        path: '/services',
      })
    })

    await act(async () => {
      resolveFirstServicesLoad?.([createRow('/services/api', { dataLength: 99 })])
    })

    expect(await screen.findByText('worker')).toBeInTheDocument()
    expect(
      loadChildrenMock.mock.calls.filter(([path]) => path === '/services'),
    ).toHaveLength(2)
  })

  it('renders compact tree rows with size and updated values, falling back to dashes on missing metadata', async () => {
    loadChildrenMock.mockResolvedValueOnce([
      createRow('/services', {
        hasChildren: true,
        dataLength: 2_048,
        mtime: Date.now() - 90_000,
      }),
      createRow('/broken', {
        dataLength: null,
        mtime: null,
      }),
    ])

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))
    const brokenRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('broken'))

    expect(servicesRow).toBeDefined()
    expect(brokenRow).toBeDefined()
    expect(within(servicesRow as HTMLElement).getByText('2 KB')).toBeInTheDocument()
    expect(
      within(servicesRow as HTMLElement).getByText(/ago$/i),
    ).toBeInTheDocument()
    expect(within(brokenRow as HTMLElement).getAllByText('--')).toHaveLength(2)
  })

  it('creates child nodes from the tree row context menu', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', {
          name: 'connect connection Readonly',
        }),
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const servicesRow = (await screen.findByText('services')).closest('.tree-row')
    expect(servicesRow).toBeTruthy()

    fireEvent.contextMenu(servicesRow as HTMLElement)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create child node' }))

    fireEvent.change(screen.getByLabelText('child node name'), {
      target: { value: 'worker' },
    })
    fireEvent.change(screen.getByLabelText('child node data'), {
      target: { value: '{"enabled":true}' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('dialog', { name: 'Create child node' }))
    })

    expect(createMock).toHaveBeenCalledWith(
      '/services/worker',
      new TextEncoder().encode('{"enabled":true}'),
    )
  })

  it('deletes subtrees and manages node marks from the tree row context menu', async () => {
    nodeMarksListMock.mockResolvedValueOnce({
      '/services': 'yellow',
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', {
          name: 'connect connection Readonly',
        }),
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const servicesRow = (await screen.findByText('services')).closest('.tree-row')
    expect(servicesRow).toBeTruthy()

    expect(await screen.findByLabelText('yellow node mark')).toBeInTheDocument()

    fireEvent.contextMenu(servicesRow as HTMLElement)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'green node mark' }))

    expect(nodeMarksSetMock).toHaveBeenCalledWith(
      'readonly',
      '/services',
      'green',
    )
    expect(await screen.findByLabelText('green node mark')).toBeInTheDocument()

    fireEvent.contextMenu(servicesRow as HTMLElement)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'green node mark' }))

    expect(nodeMarksClearMock).toHaveBeenCalledWith(
      'readonly',
      '/services',
      false,
    )

    fireEvent.contextMenu(servicesRow as HTMLElement)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete node' }))

    expect(
      await screen.findByText(/contains child nodes/i),
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))
    })

    expect(deleteMock).toHaveBeenCalledWith('/services', { recursive: true })
  })

  it('refreshes the loaded tree and expanded branches from the header action', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    let loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    let servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(await screen.findByText('api')).toBeInTheDocument()

    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return [
          createRow('/configs', { dataLength: 512 }),
          createRow('/services', { hasChildren: true, dataLength: 2_048 }),
        ]
      }

      if (path === '/services') {
        return [createRow('/services/worker', { dataLength: 88 })]
      }

      return []
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh tree' }))
    })

    expect(await screen.findByText('worker')).toBeInTheDocument()
    expect(screen.queryByText('api')).not.toBeInTheDocument()
  })
})
