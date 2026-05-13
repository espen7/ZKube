import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  channels,
  createDesktopApi,
  type RuntimeEventPayload,
} from '../../src/shared/ipc'

describe('desktop bridge', () => {
  it('invokes typed channels through the transport', async () => {
    const invoke = vi.fn().mockResolvedValue({ version: '0.1.0' })
    const on = vi.fn()
    const api = createDesktopApi({ invoke, on })

    await api.app.getVersion()

    expect(invoke).toHaveBeenCalledWith('app:getVersion', undefined)
    expect(typeof api.runtime.subscribe).toBe('function')
  })

  it('subscribes to the runtime event channel and returns the unsubscribe fn', () => {
    const invoke = vi.fn()
    const unsubscribe = vi.fn()
    const on = vi.fn().mockReturnValue(unsubscribe)
    const api = createDesktopApi({ invoke, on })
    const listener = vi.fn<(payload: RuntimeEventPayload) => void>()

    const stop = api.runtime.subscribe(listener)

    expect(on).toHaveBeenCalledWith(channels.runtimeEvent, listener)
    expect(stop).toBe(unsubscribe)
  })

  it('exposes a typed desktop api contract', () => {
    const api = createDesktopApi({
      invoke: vi.fn(),
      on: vi.fn(),
    })

    expectTypeOf(api.runtime.subscribe).parameter(0).toEqualTypeOf<
      (payload: RuntimeEventPayload) => void
    >()
  })
})
