export type ContentSecurityPolicyMode = 'development' | 'production'

function joinDirective(name: string, values: string[]) {
  return `${name} ${values.join(' ')}`
}

export function createContentSecurityPolicy(
  mode: ContentSecurityPolicyMode,
  devServerUrl = 'http://localhost:5173',
) {
  const directives = [
    joinDirective('default-src', ["'self'"]),
    joinDirective('base-uri', ["'self'"]),
    joinDirective('object-src', ["'none'"]),
    joinDirective('frame-ancestors', ["'none'"]),
    joinDirective('worker-src', ["'self'", 'blob:']),
    joinDirective('child-src', ["'self'", 'blob:']),
  ]

  if (mode === 'development') {
    const devOrigin = new URL(devServerUrl).origin
    const devSocketOrigin = devOrigin.replace(/^http/i, 'ws')

    directives.push(
      joinDirective('script-src', ["'self'", "'unsafe-inline'", devOrigin]),
      joinDirective('style-src', ["'self'", "'unsafe-inline'", devOrigin]),
      joinDirective('img-src', ["'self'", 'data:', 'blob:', devOrigin]),
      joinDirective('font-src', ["'self'", 'data:', devOrigin]),
      joinDirective('connect-src', ["'self'", devOrigin, devSocketOrigin]),
    )

    return directives.join('; ')
  }

  directives.push(
    joinDirective('script-src', ["'self'"]),
    joinDirective('style-src', ["'self'", "'unsafe-inline'"]),
    joinDirective('img-src', ["'self'", 'data:', 'blob:']),
    joinDirective('font-src', ["'self'", 'data:']),
    joinDirective('connect-src', ["'self'"]),
  )

  return directives.join('; ')
}
