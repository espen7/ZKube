import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'

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
    typeof vi.fn<(path: string) => Promise<string[]>>
  >
  let searchMock: ReturnType<typeof vi.fn<(query: string) => Promise<string[]>>>
  let createMock: ReturnType<
    typeof vi.fn<(path: string, data: Uint8Array) => Promise<void>>
  >
  let deleteMock: ReturnType<
    typeof vi.fn<(path: string, version?: number) => Promise<void>>
  >
  let openMock: ReturnType<
    typeof vi.fn<
      (path: string) => Promise<{
        path: string
        data: Uint8Array
        stat: {
          version: number
          numChildren: number
        }
        acl: []
      }>
    >
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
    openMock = vi.fn<(path: string) => Promise<{
      path: string
      data: Uint8Array
      stat: {
        version: number
        numChildren: number
      }
      acl: []
    }>>().mockImplementation(async (path: string) => ({
      path,
      data: new TextEncoder().encode(`opened:${path}`),
      stat: {
        version: 1,
        numChildren: 0,
      },
      acl: [],
    }))

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
    expect(await screen.findByText('/configs')).toBeInTheDocument()
    expect(screen.getByText('/services')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filter nodes'), {
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
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(loadChildrenMock).toHaveBeenCalledWith('/services')
    expect(await screen.findByText('/services/api')).toBeInTheDocument()
  })

  it('runs deep search and exposes create/delete entry points', async () => {
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

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Demo create' }),
      )
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Demo delete' }),
      )
    })

    expect(createMock).toHaveBeenCalledWith(
      '/demo-node',
      expect.anything(),
    )
    expect(createMock.mock.calls[0]?.[1]?.constructor?.name).toBe('Uint8Array')
    expect(deleteMock).toHaveBeenCalledWith('/demo-node')
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

    const servicesLabel = await screen.findByText('/services')
    const servicesRow = servicesLabel.closest('li')

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', {
          name: '/services',
        }),
      )
    })

    expect(openMock).toHaveBeenCalledWith('/services')
    expect(openMock).not.toHaveBeenCalledWith('/config/service')
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

    expect(await screen.findByText('/configs')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
        type: 'connectionStateChanged',
        state: 'connected',
      })
    })

    expect(screen.queryByText('/configs')).not.toBeInTheDocument()
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
      emitRuntimeEvent({
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
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

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
      resolveServicesLoad?.(['api'])
    })

    expect(await screen.findByText('/services/api')).toBeInTheDocument()
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
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
      )
    })

    expect(await screen.findByText('/services/api')).toBeInTheDocument()

    await act(async () => {
      emitRuntimeEvent({
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
      emitRuntimeEvent({
        type: 'nodeChildrenChanged',
        path: '/',
      })
    })

    loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

    expect(servicesRow).toBeDefined()

    await act(async () => {
      fireEvent.click(
        within(servicesRow as HTMLElement).getByRole('button', { name: 'Expand' }),
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
      fireEvent.click(screen.getByRole('button', { name: 'Load root nodes' }))
    })

    const loadedTree = await screen.findByRole('list', { name: 'Loaded tree nodes' })
    const servicesRow = within(loadedTree)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('/services'))

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
      resolveFirstServicesLoad?.(['api'])
    })

    expect(await screen.findByText('/services/worker')).toBeInTheDocument()
    expect(
      loadChildrenMock.mock.calls.filter(([path]) => path === '/services'),
    ).toHaveLength(2)
  })
})
