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
  const originalConfirm = window.confirm

  beforeEach(() => {
    window.confirm = vi.fn(() => true)
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
        importFromFile: vi.fn(),
        exportToFile: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn(),
      },
      preferences: {
        getTheme: vi.fn().mockResolvedValue({
          theme: 'dark',
          language: 'en',
          fontSize: 'medium',
        }),
        setTheme: vi.fn().mockResolvedValue({ theme: 'dark' }),
        openSettingsWindow: vi.fn().mockResolvedValue(undefined),
        subscribeTheme: vi.fn(() => vi.fn()),
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
    window.confirm = originalConfirm
    window.zkube = originalZkube
  })

  it('renders saved connections and opens the new connection dialog from the tool rail', async () => {
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

  it('imports connection json from a file picker and refreshes the list', async () => {
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
    window.zkube.connections.importFromFile = vi
      .fn()
      .mockResolvedValue(importedConnections)

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /import connections/i }))

    expect(window.zkube.connections.importFromFile).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Imported Cluster')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(/imported/i)
  })

  it('exports connections to a chosen directory without showing raw json', async () => {
    window.zkube.connections.exportToFile = vi.fn().mockResolvedValue({
      filePath: 'C:\\Exports\\zkube-connections.json',
    })

    render(<App />)

    await screen.findByText('Local ZooKeeper')
    fireEvent.click(screen.getByRole('button', { name: /export connections/i }))

    expect(window.zkube.connections.exportToFile).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent(/exported/i)
    expect(screen.queryByText('[{"id":"local-zk"}]')).not.toBeInTheDocument()
  })

  it('opens the settings window from the tool rail', async () => {
    render(<App />)

    await screen.findByText('Local ZooKeeper')
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }))

    expect(window.zkube.preferences?.openSettingsWindow).toHaveBeenCalledTimes(1)
  })

  it('deletes a disconnected connection from the right-click menu after confirmation', async () => {
    render(<App />)

    const card = (await screen.findByText('Staging Cluster')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.contextMenu(card as HTMLElement)

    fireEvent.click(screen.getByRole('menuitem', { name: /delete connection/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(window.zkube.connections.delete).toHaveBeenCalledWith('staging-zk')
  })

  it('edits a disconnected connection from the right-click menu', async () => {
    const editedConnection: StoredConnection = {
      ...savedConnections[1],
      name: 'Staging Cluster Updated',
      hosts: '10.0.0.10:2181',
      chroot: '/blue',
      updatedAt: '2026-05-14T10:30:00.000Z',
    }

    window.zkube.connections.save = vi.fn().mockResolvedValue(editedConnection)

    render(<App />)

    const card = (await screen.findByText('Staging Cluster')).closest('article')
    expect(card).not.toBeNull()

    fireEvent.contextMenu(card as HTMLElement)
    fireEvent.click(screen.getByRole('menuitem', { name: /edit connection/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /connection name/i })).toHaveValue(
      'Staging Cluster',
    )
    expect(
      screen.getByRole('textbox', { name: /connection hosts/i }),
    ).toHaveValue('10.0.0.8:2181,10.0.0.9:2181')

    fireEvent.change(screen.getByRole('textbox', { name: /connection name/i }), {
      target: { value: editedConnection.name },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /connection hosts/i }), {
      target: { value: editedConnection.hosts },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /connection chroot/i }), {
      target: { value: editedConnection.chroot },
    })
    fireEvent.click(screen.getByRole('button', { name: /save connection/i }))

    expect(window.zkube.connections.save).toHaveBeenCalledWith({
      id: 'staging-zk',
      name: editedConnection.name,
      hosts: editedConnection.hosts,
      chroot: editedConnection.chroot,
      sessionTimeoutMs: savedConnections[1].sessionTimeoutMs,
    })
    expect(await screen.findByText(editedConnection.name)).toBeInTheDocument()
    expect(screen.queryByText('Staging Cluster')).not.toBeInTheDocument()
  })

  it('disables deleting the active connection from the right-click menu', async () => {
    render(<App />)

    const localCard = (await screen.findByText('Local ZooKeeper')).closest('article')
    expect(localCard).not.toBeNull()

    fireEvent.click(
      within(localCard as HTMLElement).getByRole('button', {
        name: /connect connection local zoo?keeper/i,
      }),
    )

    const localCardAfterConnect = (await screen.findByText('Local ZooKeeper')).closest('article')
    fireEvent.contextMenu(localCardAfterConnect as HTMLElement)

    expect(
      screen.getByRole('menuitem', { name: /delete connection/i }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('menuitem', { name: /edit connection/i }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(window.zkube.connections.delete).not.toHaveBeenCalled()
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

  it('shows an inline error when importing from a file fails', async () => {
    window.zkube.connections.list = vi.fn().mockResolvedValue([])
    window.zkube.connections.importFromFile = vi
      .fn()
      .mockRejectedValue(new Error('Import failed'))

    render(<App />)

    await waitFor(() => {
      expect(window.zkube.connections.list).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /import connections/i }))

    expect(await screen.findByText('Import failed')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
