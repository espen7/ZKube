import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  monacoEditorSpy: vi.fn(),
  defineThemeMock: vi.fn(),
}))

vi.mock('@monaco-editor/react', () => ({
  default: (props: {
    value?: string
    onChange?: (value?: string) => void
    theme?: string
    options?: { readOnly?: boolean; fontSize?: number }
    beforeMount?: (monaco: unknown) => void
  }) => {
    props.beforeMount?.({
      editor: {
        defineTheme: mocks.defineThemeMock,
      },
    })
    mocks.monacoEditorSpy(props)

    return (
      <textarea
        aria-label="Node data editor"
        data-testid="monaco-editor"
        readOnly={Boolean(props.options?.readOnly)}
        value={props.value ?? ''}
        onChange={(event) => props.onChange?.(event.target.value)}
      />
    )
  },
}))

import App from '../../src/renderer/App'
import { resetConnectionsStore } from '../../src/renderer/features/connections/useConnectionsStore'
import { resetTreeStore } from '../../src/renderer/features/tree/useTreeStore'
import { resetWorkbenchStore, useWorkbenchStore } from '../../src/renderer/stores/useWorkbenchStore'
import type { RuntimeEvent } from '../../src/shared/models/node'
import type { Preferences, Theme } from '../../src/shared/models/preferences'

describe('theme settings', () => {
  const originalZkube = window.zkube
  const originalLocation = window.location.href
  const runtimeListeners = new Set<(event: RuntimeEvent) => void>()
  const themeListeners = new Set<(payload: Preferences) => void>()

  beforeEach(() => {
    mocks.monacoEditorSpy.mockClear()
    mocks.defineThemeMock.mockClear()
    window.history.replaceState({}, '', '/')
    document.documentElement.removeAttribute('data-theme')

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
        importFromFile: vi.fn(),
        exportToFile: vi.fn(),
        connect: vi.fn(),
      },
      preferences: {
        getTheme: vi.fn().mockResolvedValue({
          theme: 'light',
          language: 'en',
          fontSize: 'medium',
        }),
        setTheme: vi.fn().mockImplementation(
          async (value: Theme | Partial<Preferences>) => {
            const nextPreferences: Preferences = {
              theme: typeof value === 'string' ? value : value.theme ?? 'light',
              language: typeof value === 'string' ? 'en' : value.language ?? 'en',
              fontSize:
                typeof value === 'string'
                  ? 'medium'
                  : value.fontSize ?? 'medium',
            }

            for (const listener of themeListeners) {
              listener(nextPreferences)
            }

            return nextPreferences as never
          },
        ),
        openSettingsWindow: vi.fn().mockResolvedValue(undefined),
        subscribeTheme: vi.fn((cb: (payload: Preferences) => void) => {
          themeListeners.add(cb)
          return vi.fn(() => {
            themeListeners.delete(cb)
          })
        }),
      },
      zookeeper: {
        disconnect: vi.fn(),
        loadChildren: vi.fn().mockResolvedValue([]),
        open: vi.fn().mockResolvedValue({
          path: '/config/service',
          data: new TextEncoder().encode('{"service":"zk"}'),
          stat: {
            version: 1,
            numChildren: 0,
            mtime: 1_715_000_000_000,
            dataLength: 16,
          },
          acl: [],
        }),
        search: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        saveAcl: vi.fn(),
      },
      runtime: {
        subscribe: vi.fn((cb: (event: RuntimeEvent) => void) => {
          runtimeListeners.add(cb)
          return vi.fn(() => {
            runtimeListeners.delete(cb)
          })
        }),
      },
    }
  })

  afterEach(() => {
    runtimeListeners.clear()
    themeListeners.clear()
    resetConnectionsStore()
    resetTreeStore()
    resetWorkbenchStore()
    document.documentElement.removeAttribute('data-theme')
    window.history.replaceState({}, '', originalLocation)
    window.zkube = originalZkube
  })

  it('applies the persisted light theme to the app shell and Monaco editor', async () => {
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      useWorkbenchStore.getState().openNode('/config/service')
    })

    await screen.findByTestId('monaco-editor')

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
      expect(mocks.monacoEditorSpy).toHaveBeenCalled()
      expect(mocks.monacoEditorSpy.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          theme: 'vs',
          options: expect.objectContaining({
            fontSize: 14,
          }),
        }),
      )
    })
  })

  it('applies the custom monokai editor theme in dark mode', async () => {
    if (!window.zkube.preferences) {
      throw new Error('Expected preferences API to exist in test setup')
    }

    window.zkube.preferences.getTheme = vi.fn().mockResolvedValue({
      theme: 'dark',
      language: 'en',
      fontSize: 'medium',
    })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      useWorkbenchStore.getState().openNode('/config/service')
    })

    await screen.findByTestId('monaco-editor')

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
      expect(mocks.monacoEditorSpy.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          theme: 'zkube-monokai',
        }),
      )
    })
  })

  it('renders the standalone settings window with theme, font size, and language controls', async () => {
    window.history.replaceState({}, '', '/?window=settings')

    await act(async () => {
      render(<App />)
    })

    expect(await screen.findByRole('heading', { name: /appearance/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /light/i })).toBeChecked()
    expect(screen.getByRole('heading', { name: /font size/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /medium/i })).toBeChecked()
    expect(screen.getByRole('heading', { name: /language/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /english/i })).toBeChecked()
    expect(document.querySelector('.settings-shell--scroll')).not.toBeNull()
    expect(document.querySelector('.settings-panel__body--scroll')).not.toBeNull()
  })

  it('switches the settings window and main shell copy to chinese', async () => {
    window.history.replaceState({}, '', '/?window=settings')

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(screen.getByRole('radio', { name: /简体中文/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '外观' })).toBeInTheDocument()
    })
  })

  it('updates theme selection and persists the change', async () => {
    window.history.replaceState({}, '', '/?window=settings')

    await act(async () => {
      render(<App />)
    })

    fireEvent.click(screen.getByRole('radio', { name: /dark/i }))

    await waitFor(() => {
      expect(window.zkube.preferences?.setTheme).toHaveBeenCalledWith('dark')
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
  })
})
