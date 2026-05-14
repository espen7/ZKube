import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../../src/renderer/App'

describe('App shell bootstrap', () => {
  it('renders the workspace without the branded top header', () => {
    render(<App />)

    expect(screen.queryByRole('heading', { name: 'ZKube' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'MARK NODE' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Node Inspector' })).not.toBeInTheDocument()
  })
})
