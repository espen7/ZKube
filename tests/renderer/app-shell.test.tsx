import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../../src/renderer/App'

describe('App shell bootstrap', () => {
  it('renders the initial ZKube workspace title', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'ZKube' }),
    ).toBeInTheDocument()
  })
})
