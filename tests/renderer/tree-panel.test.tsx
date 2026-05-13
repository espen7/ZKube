import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'

describe('Tree panel', () => {
  const originalZkube = window.zkube
  let runtimeListener:
    | ((event: {
        type: string
        path?: string
        state?: 'connected' | 'disconnected' | 'reconnecting'
      }) => void)
    | undefined
  let loadChildrenMock: ReturnType<
    typeof vi.fn<(path: string) => Promise<string[]>>
  >
  let searchMock: ReturnType<typeof vi.fn<(query: string) => Promise<string[]>>>
  let createMock: ReturnType<
    typeof vi.fn<(path: string, data: Uint8Array) => Promise<void>>
  >
  let deleteMock: ReturnType<
    typeof vi.fn<(path: string, version?: number) => Promise<void>>
  >

  beforeEach(() => {
    loadChildrenMock = vi
      .fn<(path: string) => Promise<string[]>>()
      .mockImplementation(async (path: string) => {
        if (path === '/') {
          return ['configs', 'services']
        }

        if (path === '/services') {
          return ['api', 'web']
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
      .fn<(path: string, version?: number) => Promise<void>>()
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
        loadChildren: loadChildrenMock,
        open: vi.fn(),
        search: searchMock,
        create: createMock,
        delete: deleteMock,
        update: vi.fn(),
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn((cb) => {
          runtimeListener = cb
          return vi.fn()
        }),
      },
    }
  })

  afterEach(async () => {
    resetConnectionsStore()

    try {
      const treeModulePath =
        '../../src/renderer/features/tree/' + 'useTreeStore'
      const treeModule = await import(treeModulePath)
      treeModule.resetTreeStore()
    } catch {
      // Tree store is introduced by this task.
    }

    window.zkube = originalZkube
  })

  it('lazy loads root nodes and filters loaded entries locally', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '\u52a0\u8f7d\u6839\u8282\u70b9' }),
      )
    })

    expect(loadChildrenMock).toHaveBeenCalledWith('/')
    expect(await screen.findByText('/configs')).toBeInTheDocument()
    expect(screen.getByText('/services')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('\u7b5b\u9009\u8282\u70b9'), {
      target: { value: 'serv' },
    })

    expect(screen.getByText('/services')).toBeInTheDocument()
    expect(screen.queryByText('/configs')).not.toBeInTheDocument()
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('expands a loaded child by requesting the absolute child path', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    const loadedTree = await screen.findByRole('list', { name: '已加载节点' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: '展开' }),
      )
    })

    expect(loadChildrenMock).toHaveBeenCalledWith('/services')
    expect(await screen.findByText('/services/api')).toBeInTheDocument()
  })

  it('runs deep search and exposes create/delete entry points', async () => {
    await act(async () => {
      render(<App />)
    })

    fireEvent.change(screen.getByLabelText('\u7b5b\u9009\u8282\u70b9'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '\u6df1\u5ea6\u641c\u7d22' }),
      )
    })

    expect(searchMock).toHaveBeenCalledWith('live')
    expect(await screen.findByText('/services/api/live')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '\u6f14\u793a\u521b\u5efa' }),
      )
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '\u6f14\u793a\u5220\u9664' }),
      )
    })

    expect(createMock).toHaveBeenCalledWith(
      '/demo-node',
      expect.anything(),
    )
    expect(createMock.mock.calls[0]?.[1]?.constructor?.name).toBe('Uint8Array')
    expect(deleteMock).toHaveBeenCalledWith('/demo-node')
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

    fireEvent.change(screen.getByLabelText('筛选节点'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '深度搜索' }))
    })

    fireEvent.change(screen.getByLabelText('筛选节点'), {
      target: { value: 'conf' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '深度搜索' }))
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

    fireEvent.change(screen.getByLabelText('筛选节点'), {
      target: { value: 'live' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '深度搜索' }))
    })

    await act(async () => {
      runtimeListener?.({
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
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    expect(await screen.findByText('/configs')).toBeInTheDocument()

    await act(async () => {
      runtimeListener?.({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(screen.queryByText('/configs')).not.toBeInTheDocument()
    expect(
      screen.getByText('先加载根节点，再展开需要的目录。'),
    ).toBeInTheDocument()
  })

  it('refreshes loaded branches when runtime children change events arrive', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    expect(await screen.findByText('/configs')).toBeInTheDocument()

    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return ['configs', 'services', 'jobs']
      }

      if (path === '/services') {
        return ['api', 'web']
      }

      return []
    })

    await act(async () => {
      runtimeListener?.({
        type: 'nodeChildrenChanged',
        path: '/',
      })
    })

    expect(await screen.findByText('/jobs')).toBeInTheDocument()
  })

  it('keeps unrelated branch loads usable after runtime invalidation', async () => {
    let resolveServicesLoad: ((value: string[]) => void) | undefined

    loadChildrenMock.mockImplementation((path: string) => {
      if (path === '/') {
        return Promise.resolve(['configs', 'services'])
      }

      if (path === '/services') {
        return new Promise<string[]>((resolve) => {
          resolveServicesLoad = resolve
        })
      }

      return Promise.resolve([])
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    const loadedTree = await screen.findByRole('list', { name: '已加载节点' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: '展开' }),
      )
    })

    await act(async () => {
      runtimeListener?.({
        type: 'nodeChildrenChanged',
        path: '/configs',
      })
    })

    await act(async () => {
      resolveServicesLoad?.(['api'])
    })

    expect(await screen.findByText('/services/api')).toBeInTheDocument()
  })

  it('reloads recreated branches after a runtime delete event', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    let loadedTree = await screen.findByRole('list', { name: '已加载节点' })
    let servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: '展开' }),
      )
    })

    expect(await screen.findByText('/services/api')).toBeInTheDocument()

    await act(async () => {
      runtimeListener?.({
        type: 'nodeDeleted',
        path: '/services',
      })
    })

    loadChildrenMock.mockImplementation(async (path: string) => {
      if (path === '/') {
        return ['configs', 'services']
      }

      if (path === '/services') {
        return ['worker']
      }

      return []
    })

    await act(async () => {
      runtimeListener?.({
        type: 'nodeChildrenChanged',
        path: '/',
      })
    })

    loadedTree = await screen.findByRole('list', { name: '已加载节点' })
    servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: '展开' }),
      )
    })

    expect(await screen.findByText('/services/worker')).toBeInTheDocument()
    expect(
      loadChildrenMock.mock.calls.filter(([path]) => path === '/services'),
    ).toHaveLength(2)
  })

  it('reloads a branch when that same path changes during an in-flight load', async () => {
    let resolveFirstServicesLoad: ((value: string[]) => void) | undefined
    let servicesLoadCount = 0

    loadChildrenMock.mockImplementation((path: string) => {
      if (path === '/') {
        return Promise.resolve(['configs', 'services'])
      }

      if (path === '/services') {
        servicesLoadCount += 1

        if (servicesLoadCount === 1) {
          return new Promise<string[]>((resolve) => {
            resolveFirstServicesLoad = resolve
          })
        }

        return Promise.resolve(['worker'])
      }

      return Promise.resolve([])
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    })

    const loadedTree = await screen.findByRole('list', { name: '已加载节点' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: '展开' }),
      )
    })

    await act(async () => {
      runtimeListener?.({
        type: 'nodeChildrenChanged',
        path: '/services',
      })
    })

    await act(async () => {
      resolveFirstServicesLoad?.(['api'])
    })

    expect(await screen.findByText('/services/worker')).toBeInTheDocument()
    expect(
      loadChildrenMock.mock.calls.filter(([path]) => path === '/services'),
    ).toHaveLength(2)
  })
})
