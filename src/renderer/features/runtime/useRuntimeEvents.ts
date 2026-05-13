import { useEffect, useState } from 'react'

import type { RuntimeEvent } from '../../../shared/models/node'

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting'

function getRuntimeMessage(event: RuntimeEvent) {
  switch (event.type) {
    case 'connectionStateChanged':
      return `Connection ${event.state}`
    case 'nodeDataChanged':
      return `Data changed: ${event.path}`
    case 'nodeChildrenChanged':
      return `Children changed: ${event.path}`
    case 'nodeDeleted':
      return `Node deleted: ${event.path}`
  }
}

export function useRuntimeEvents() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected')
  const [watcherCount, setWatcherCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!window.zkube?.runtime.subscribe) {
      return undefined
    }

    const unsubscribe = window.zkube.runtime.subscribe((event) => {
      if (event.type === 'connectionStateChanged') {
        setConnectionState(event.state)
        setWatcherCount(0)
        setMessage(getRuntimeMessage(event))
        return
      }

      setWatcherCount((count) => count + 1)
      setMessage(getRuntimeMessage(event))
    })

    return typeof unsubscribe === 'function' ? unsubscribe : undefined
  }, [])

  return {
    connectionState,
    watcherCount,
    message,
  }
}
