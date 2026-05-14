import { describe, expect, it } from 'vitest'

import { createContentSecurityPolicy } from '../../config/content-security-policy'

describe('content security policy', () => {
  it('builds a development policy with Vite dev server allowances and without unsafe-eval', () => {
    const csp = createContentSecurityPolicy('development', 'http://localhost:4173')

    expect(csp).toContain("script-src 'self' 'unsafe-inline' http://localhost:4173")
    expect(csp).toContain("connect-src 'self' http://localhost:4173 ws://localhost:4173")
    expect(csp).not.toContain('frame-ancestors')
    expect(csp).not.toContain('unsafe-eval')
  })

  it('builds a stricter production policy for packaged renderer assets', () => {
    const csp = createContentSecurityPolicy('production')

    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).not.toContain('frame-ancestors')
    expect(csp).not.toContain('localhost')
    expect(csp).not.toContain('unsafe-eval')
  })
})
