import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  default: (props: { value?: string }) => (
    <div data-testid="monaco-editor">{props.value ?? ''}</div>
  ),
}))

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetTreeStore } from '../../src/renderer/features/tree/useTreeStore'
import { resetWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'

describe('navigation workspace layout', () => {
  const originalZkube = window.zkube
  const originalClipboard = navigator.clipboard

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    window.zkube = {
      app: {
        getVersion: vi.fn().mockResolvedValue({ version: '0.1.0' }),
        ping: vi.fn(),
      },
      connections: {
        list: vi.fn().mockResolvedValue([]),
        save: vi.fn(),
        exportAll: vi.fn(),
        importJson: vi.fn(),
        importFromFile: vi.fn(),
        exportToFile: vi.fn(),
        connect: vi.fn(),
      },
      preferences: {
        getTheme: vi.fn().mockResolvedValue({ theme: 'dark' }),
        setTheme: vi.fn().mockResolvedValue({ theme: 'dark' }),
        openSettingsWindow: vi.fn().mockResolvedValue(undefined),
        subscribeTheme: vi.fn(() => vi.fn()),
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: vi.fn().mockResolvedValue([]),
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
    resetTreeStore()
    resetWorkbenchStore()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
    window.zkube = originalZkube
  })

  it('groups the tool rail, connections panel, and tree panel inside a shared navigation workspace', () => {
    render(<App />)

    const navigationWorkspace = screen.getByLabelText('Navigation workspace')
    const toolRail = within(navigationWorkspace).getByLabelText('Navigation tools')
    const createButton = within(toolRail).getByRole('button', {
      name: /create connection/i,
    })
    const createIcon = createButton.querySelector('[data-icon]')

    expect(createIcon).not.toBeNull()
    expect(createIcon).toHaveAttribute('data-icon', 'sym-add_box')
    expect(createButton).not.toHaveTextContent(/^N$/)
    expect(
      within(toolRail)
        .getByRole('button', { name: /open settings/i })
        .querySelector('[data-icon]'),
    ).toHaveAttribute('data-icon', 'sym-settings')
    expect(
      within(toolRail).getByRole('button', { name: /open settings/i }),
    ).toBeInTheDocument()
    expect(
      within(toolRail)
        .getByRole('button', { name: /import connections/i })
        .querySelector('[data-icon]'),
    ).toHaveAttribute('data-icon', 'sym-download')
    expect(
      within(toolRail).getByRole('button', { name: /import connections/i }),
    ).toBeInTheDocument()
    expect(
      within(toolRail)
        .getByRole('button', { name: /export connections/i })
        .querySelector('[data-icon]'),
    ).toHaveAttribute('data-icon', 'sym-upload')
    expect(
      within(toolRail).getByRole('button', { name: /export connections/i }),
    ).toBeInTheDocument()
    expect(
      within(toolRail)
        .getByRole('button', { name: /about zkube/i })
        .querySelector('[data-icon]'),
    ).toHaveAttribute('data-icon', 'sym-info')
    expect(
      within(toolRail).getByRole('button', { name: /about zkube/i }),
    ).toBeInTheDocument()
    const bottomGroup = toolRail.querySelector('.side-nav__footer')
    expect(bottomGroup).not.toBeNull()
    const bottomButtons = within(bottomGroup as HTMLElement).getAllByRole('button')
    expect(bottomButtons).toHaveLength(2)
    expect(bottomButtons[0]).toHaveAttribute('aria-label', 'open settings')
    expect(bottomButtons[1]).toHaveAttribute('aria-label', 'about zkube')
    expect(
      within(navigationWorkspace).getByLabelText('Connections sidebar'),
    ).toBeInTheDocument()
    expect(within(navigationWorkspace).getByText('Tree')).toBeInTheDocument()
    expect(screen.getByLabelText('Saved connections list')).toBeInTheDocument()
    expect(screen.getByLabelText('Tree content region')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'MARK NODE' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Node Inspector' })).not.toBeInTheDocument()
  })

  it('exposes a draggable divider between the tree workspace and node workbench', () => {
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1500,
    })

    render(<App />)

    const appShell = screen.getByLabelText('ZKube app shell')
    const divider = screen.getByRole('separator', { name: /resize tree and workbench/i })

    expect(appShell.style.getPropertyValue('--tree-width')).toBe('380px')

    fireEvent.mouseDown(divider, { clientX: 386 })
    fireEvent.mouseMove(window, { clientX: 426 })
    fireEvent.mouseUp(window)

    expect(appShell.style.getPropertyValue('--tree-width')).toBe('420px')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('clamps the tree width so dragging cannot hide the workbench', () => {
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1500,
    })

    render(<App />)

    const appShell = screen.getByLabelText('ZKube app shell')
    const divider = screen.getByRole('separator', { name: /resize tree and workbench/i })

    fireEvent.mouseDown(divider, { clientX: 386 })
    fireEvent.mouseMove(window, { clientX: 1400 })
    fireEvent.mouseUp(window)

    expect(appShell.style.getPropertyValue('--tree-width')).toBe('640px')

    fireEvent.mouseDown(divider, { clientX: 646 })
    fireEvent.mouseMove(window, { clientX: 100 })
    fireEvent.mouseUp(window)

    expect(appShell.style.getPropertyValue('--tree-width')).toBe('280px')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('opens an about dialog with version info and copies the project link', async () => {
    render(<App />)

    const navigationWorkspace = screen.getByLabelText('Navigation workspace')
    fireEvent.click(screen.getByRole('button', { name: /about zkube/i }))

    const dialog = await screen.findByRole('dialog', { name: /about zkube/i })

    expect(dialog).toBeInTheDocument()
    expect(navigationWorkspace).not.toContainElement(dialog)
    expect(screen.getByText('0.1.0')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('https://github.com/espen7/ZKube'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://github.com/espen7/ZKube',
    )
  })

  it('toggles the connections panel from a tool rail button', () => {
    render(<App />)

    const navigationWorkspace = screen.getByLabelText('Navigation workspace')
    const sidebar = screen.getByLabelText('Connections sidebar')
    const sideNav = within(navigationWorkspace).getByLabelText('Navigation tools')
    const toggle = within(navigationWorkspace).getByRole('button', {
      name: /toggle connections panel/i,
    })

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(sideNav).toHaveAttribute('data-collapsed', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(sideNav).toHaveAttribute('data-collapsed', 'true')
    expect(sidebar).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(sideNav).toHaveAttribute('data-collapsed', 'false')
  })
})
