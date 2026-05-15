import { useEffect, useRef, useState } from 'react'

import type { ConnectionState, ZooKeeperOverview } from '../../../shared/models/node'

const POLL_INTERVAL_MS = 5_000

export function useZooKeeperOverview(connectionState: ConnectionState) {
  const [overview, setOverview] = useState<ZooKeeperOverview | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (connectionState !== 'connected' || !window.zkube?.zookeeper.getOverview) {
      inFlightRef.current = false
      setOverview(null)
      return undefined
    }

    let disposed = false
    let intervalId: number | null = null

    const poll = async () => {
      if (inFlightRef.current) {
        return
      }

      inFlightRef.current = true

      try {
        const nextOverview = await window.zkube.zookeeper.getOverview?.()
        if (disposed || !nextOverview) {
          return
        }

        setOverview(nextOverview.available ? nextOverview : null)
      } catch {
        if (!disposed) {
          setOverview(null)
        }
      } finally {
        if (!disposed) {
          inFlightRef.current = false
        }
      }
    }

    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      disposed = true
      inFlightRef.current = false
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [connectionState])

  return overview
}
