import { describe, expect, it, vi } from 'vitest'

import { createDesktopApi } from '../../src/shared/ipc'

describe('desktop bridge', () => {
  it('invokes typed channels through the transport', async () => {
    const invoke = vi.fn().mockResolvedValue({ version: '0.1.0' })
    const on = vi.fn()
    const api = createDesktopApi({ invoke, on })

    await api.app.getVersion()

    expect(invoke).toHaveBeenCalledWith('app:getVersion', undefined)
    expect(typeof api.runtime.subscribe).toBe('function')
  })
})
