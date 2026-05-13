import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoredConnection } from '../../src/shared/models/connection'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import App from '../../src/renderer/App'

const savedConnections: StoredConnection[] = [
  {
    id: 'local-zk',
    name: '本地 ZooKeeper',
    hosts: '127.0.0.1:2181',
    chroot: '/dev',
    sessionTimeoutMs: 20_000,
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: '2026-05-13T08:00:00.000Z',
  },
  {
    id: 'staging-zk',
    name: '预发集群',
    hosts: '10.0.0.8:2181,10.0.0.9:2181',
    sessionTimeoutMs: 30_000,
    createdAt: '2026-05-13T08:10:00.000Z',
    updatedAt: '2026-05-13T08:10:00.000Z',
  },
]

describe('Connections workspace', () => {
  const originalZkube = window.zkube

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
        connect: vi.fn(),
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: vi.fn(),
        open: vi.fn(),
        search: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn(),
      },
    }
  })

  afterEach(() => {
    resetConnectionsStore()
    window.zkube = originalZkube
  })

  it('renders saved connections and opens the new connection dialog', async () => {
    render(<App />)

    expect(await screen.findByText('本地 ZooKeeper')).toBeInTheDocument()
    expect(screen.getByText('预发集群')).toBeInTheDocument()
    expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '新建连接' }))

    expect(
      screen.getByRole('dialog', { name: '新建连接' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('连接名称')).toBeInTheDocument()
  })

  it('surfaces exported connection JSON after clicking export', async () => {
    window.zkube.connections.exportAll = vi
      .fn()
      .mockResolvedValue('[{"id":"local-zk"}]')

    render(<App />)

    await screen.findByText('本地 ZooKeeper')
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    expect(await screen.findByText('导出内容已就绪')).toBeInTheDocument()
    expect(await screen.findByText('[{"id":"local-zk"}]')).toBeInTheDocument()
  })

  it('shows an inline error when connection fails', async () => {
    window.zkube.connections.connect = vi
      .fn()
      .mockRejectedValue(new Error('连接失败'))

    render(<App />)

    await screen.findByText('本地 ZooKeeper')
    fireEvent.click(screen.getAllByRole('button', { name: '连接' })[0])

    expect(await screen.findByText('连接失败')).toBeInTheDocument()
  })

  it('shows an inline error when loading connections fails', async () => {
    window.zkube.connections.list = vi
      .fn()
      .mockRejectedValue(new Error('连接配置损坏'))

    render(<App />)

    expect(await screen.findByText('连接配置损坏')).toBeInTheDocument()
  })
})
