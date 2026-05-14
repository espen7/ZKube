import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'

describe('connected session root loading', () => {
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

  beforeEach(() => {
    loadChildrenMock = vi
      .fn<(path: string) => Promise<string[]>>()
      .mockImplementation(async (path: string) => {
        if (path === '/') {
          return ['configs', 'services']
        }

        return []
      })

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
        search: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
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

    const treeModule = await import('../../src/renderer/features/tree/useTreeStore')
    treeModule.resetTreeStore()

    runtimeListeners.clear()
    window.zkube = originalZkube
  })

  it('automatically loads root nodes after a connected runtime event', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(loadChildrenMock).not.toHaveBeenCalled()

    await act(async () => {
      for (const listener of runtimeListeners) {
        listener({
          type: 'connectionStateChanged',
          state: 'connected',
        })
      }
    })

    await waitFor(() => {
      expect(loadChildrenMock).toHaveBeenCalledWith('/')
    })
    expect(await screen.findByText('/configs')).toBeInTheDocument()
    expect(screen.getByText('/services')).toBeInTheDocument()
  })
})
