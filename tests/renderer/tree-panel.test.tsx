import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'

describe('Tree panel', () => {
  const originalZkube = window.zkube
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
        return ['/configs', '/services']
      }

      if (path === '/services') {
        return ['/services/api', '/services/web']
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
        subscribe: vi.fn(),
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
})
