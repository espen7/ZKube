import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'
import { formatJson, formatXml } from '../../src/renderer/features/workbench/formatters'
import type { NodeSnapshot } from '../../src/shared/models/node'

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

  beforeEach(() => {
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
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn(() => vi.fn()),
      },
    }
  })

  afterEach(async () => {
    try {
      const workbenchModule = await import(
        '../../src/renderer/stores/useWorkbenchStore'
      )
      workbenchModule.resetWorkbenchStore()
    } catch {
      // Store is introduced by this task.
    }

    window.zkube = originalZkube
  })

  it('loads the default node and switches between data/meta/acl panes', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(openMock).toHaveBeenCalledWith('/config/service')
    expect(await screen.findByDisplayValue('{"service":"zk"}')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Meta' }))
    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ACL' }))
    expect(
      screen.getByText('ACL editor will arrive in Task 9.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Data' }))
    expect(screen.getByDisplayValue('{"service":"zk"}')).toBeInTheDocument()
  })

  it('formats JSON in the editor and saves through the zookeeper bridge', async () => {
    await act(async () => {
      render(<App />)
    })

    const editor = await screen.findByLabelText('Node data editor')

    fireEvent.change(editor, {
      target: { value: '{"service":"zk","enabled":true}' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Format JSON' }))

    expect(editor).toHaveValue('{\n  "service": "zk",\n  "enabled": true\n}')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(updateMock).toHaveBeenCalledWith(
      '/config/service',
      new TextEncoder().encode('{\n  "service": "zk",\n  "enabled": true\n}'),
      7,
    )
  })
})
