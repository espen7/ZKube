import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoredConnection } from '../../src/shared/models/connection'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import App from '../../src/renderer/App'

const savedConnections: StoredConnection[] = [
  {
    id: 'local-zk',
    name: 'Local ZooKeeper',
    hosts: '127.0.0.1:2181',
    chroot: '/dev',
    sessionTimeoutMs: 20_000,
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: '2026-05-13T08:00:00.000Z',
  },
  {
    id: 'staging-zk',
    name: 'Staging Cluster',
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

    expect(await screen.findByText('Local ZooKeeper')).toBeInTheDocument()
    expect(screen.getByText('Staging Cluster')).toBeInTheDocument()
    expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /create connection/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /connection name/i }),
    ).toBeInTheDocument()
  })

  it('creates a first connection from the new connection dialog', async () => {
    const createdConnection: StoredConnection = {
      id: 'prod-zk',
      name: 'Production ZooKeeper',
      hosts: 'zk-1:2181,zk-2:2181',
      sessionTimeoutMs: 30_000,
      createdAt: '2026-05-14T08:30:00.000Z',
      updatedAt: '2026-05-14T08:30:00.000Z',
    }

    window.zkube.connections.list = vi.fn().mockResolvedValue([])
    window.zkube.connections.save = vi.fn().mockResolvedValue(createdConnection)

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /create connection/i }))

    fireEvent.change(screen.getByRole('textbox', { name: /connection name/i }), {
      target: { value: createdConnection.name },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /connection hosts/i }), {
      target: { value: createdConnection.hosts },
    })
    fireEvent.click(screen.getByRole('button', { name: /save connection/i }))

    expect(window.zkube.connections.save).toHaveBeenCalledTimes(1)
    expect(window.zkube.connections.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: createdConnection.name,
        hosts: createdConnection.hosts,
      }),
    )
    expect(await screen.findByText(createdConnection.name)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)
  })

  it('imports connection json and refreshes the list', async () => {
    const importedConnections: StoredConnection[] = [
      {
        id: 'imported-zk',
        name: 'Imported Cluster',
        hosts: '10.10.0.1:2181',
        sessionTimeoutMs: 30_000,
        createdAt: '2026-05-14T09:00:00.000Z',
        updatedAt: '2026-05-14T09:00:00.000Z',
      },
    ]

    window.zkube.connections.list = vi.fn().mockResolvedValue([])
    window.zkube.connections.importJson = vi
      .fn()
      .mockResolvedValue(importedConnections)

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /import connections/i }))

    fireEvent.change(screen.getByRole('textbox', { name: /connection json/i }), {
      target: {
        value:
          '[{"id":"imported-zk","name":"Imported Cluster","hosts":"10.10.0.1:2181"}]',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /import connection json/i }))

    expect(window.zkube.connections.importJson).toHaveBeenCalledTimes(1)
    expect(window.zkube.connections.importJson).toHaveBeenCalledWith(
      '[{"id":"imported-zk","name":"Imported Cluster","hosts":"10.10.0.1:2181"}]',
    )
    expect(await screen.findByText('Imported Cluster')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(/imported/i)
  })

  it('surfaces exported connection JSON after clicking export', async () => {
    window.zkube.connections.exportAll = vi
      .fn()
      .mockResolvedValue('[{"id":"local-zk"}]')

    render(<App />)

    await screen.findByText('Local ZooKeeper')
    fireEvent.click(screen.getByRole('button', { name: /export connections/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/exported/i)
    expect(await screen.findByText('[{"id":"local-zk"}]')).toBeInTheDocument()
  })

  it('shows an inline error when connection fails', async () => {
    window.zkube.connections.connect = vi
      .fn()
      .mockRejectedValue(new Error('Connect failed'))

    render(<App />)

    await screen.findByText('Local ZooKeeper')
    fireEvent.click(screen.getAllByRole('button', { name: /connect connection/i })[0])

    expect(await screen.findByText('Connect failed')).toBeInTheDocument()
  })

  it('shows an inline error when loading connections fails', async () => {
    window.zkube.connections.list = vi
      .fn()
      .mockRejectedValue(new Error('Connection config is broken'))

    render(<App />)

    expect(await screen.findByText('Connection config is broken')).toBeInTheDocument()
  })

  it('shows an inline error when saving a connection fails', async () => {
    window.zkube.connections.list = vi.fn().mockResolvedValue([])
    window.zkube.connections.save = vi
      .fn()
      .mockRejectedValue(new Error('Save failed'))

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /create connection/i }))

    fireEvent.change(screen.getByRole('textbox', { name: /connection name/i }), {
      target: { value: 'Broken Cluster' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /connection hosts/i }), {
      target: { value: '127.0.0.1:2181' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save connection/i }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Save failed')
    expect(dialog).toBeInTheDocument()
  })

  it('shows an inline error when importing json fails', async () => {
    window.zkube.connections.list = vi.fn().mockResolvedValue([])
    window.zkube.connections.importJson = vi
      .fn()
      .mockRejectedValue(new Error('Import failed'))

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /import connections/i }))

    fireEvent.change(screen.getByRole('textbox', { name: /connection json/i }), {
      target: { value: '[invalid]' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import connection json/i }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Import failed')
    expect(dialog).toBeInTheDocument()
  })
})
