import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBar } from '../../src/renderer/features/runtime/StatusBar'

describe('status bar connection states', () => {
  it('renders a healthy badge for connected sessions', () => {
    render(
      <StatusBar
        connectionState="connected"
        watcherCount={3}
        message="Children changed: /services"
      />,
    )

    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByLabelText('Connection status indicator')).toHaveAttribute(
      'data-state',
      'connected',
    )
  })

  it('renders a transitional badge for connecting sessions', () => {
    render(
      <StatusBar
        connectionState="connecting"
        watcherCount={0}
        message="Connecting..."
      />,
    )

    const indicator = screen.getByLabelText('Connection status indicator')

    expect(within(indicator).getByText('Connecting...')).toBeInTheDocument()
    expect(indicator).toHaveAttribute('data-state', 'connecting')
  })
})
