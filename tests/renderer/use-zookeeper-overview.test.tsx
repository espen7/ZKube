import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useZooKeeperOverview } from '../../src/renderer/features/runtime/useZooKeeperOverview'
import type { ZooKeeperOverview } from '../../src/shared/models/node'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

function OverviewHarness() {
  const overview = useZooKeeperOverview('connected')
  return <div>{overview?.serverState ?? 'empty'}</div>
}

describe('useZooKeeperOverview', () => {
  const originalZkube = window.zkube
  let getOverviewMock: ReturnType<typeof vi.fn<() => Promise<ZooKeeperOverview>>>

  beforeEach(() => {
    vi.useFakeTimers()
    getOverviewMock = vi.fn()
    window.zkube = {
      ...window.zkube,
      zookeeper: {
        ...window.zkube?.zookeeper,
        getOverview: getOverviewMock,
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    window.zkube = originalZkube
  })

  it('does not start a second overview request while the previous poll is still in flight', async () => {
    const deferred = createDeferred<ZooKeeperOverview>()
    getOverviewMock.mockReturnValueOnce(deferred.promise)
    getOverviewMock.mockResolvedValue({
      sourceHost: '192.168.171.15:2181',
      sourceCommand: 'srvr',
      serverState: 'follower',
      avgLatency: 18,
      packetsReceived: 91,
      packetsSent: 77,
      numAliveConnections: 12,
      znodeCount: 433,
      watchCount: null,
      approximateDataSize: null,
      collectedAt: 1_715_000_000_000,
      available: true,
      reason: null,
    })

    render(<OverviewHarness />)

    expect(getOverviewMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(getOverviewMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      deferred.resolve({
        sourceHost: '192.168.171.15:2181',
        sourceCommand: 'srvr',
        serverState: 'follower',
        avgLatency: 18,
        packetsReceived: 91,
        packetsSent: 77,
        numAliveConnections: 12,
        znodeCount: 433,
        watchCount: null,
        approximateDataSize: null,
        collectedAt: 1_715_000_000_000,
        available: true,
        reason: null,
      })
      await Promise.resolve()
    })

    expect(screen.getByText('follower')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    expect(getOverviewMock).toHaveBeenCalledTimes(2)
  })
})
