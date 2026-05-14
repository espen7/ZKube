import { useEffect, useState } from 'react'

import { useConnectionsStore } from '../connections/useConnectionsStore'
import { getConnectionRuntimeMessage } from './connection-state'
import type { RuntimeEvent } from '../../../shared/models/node'
import { useThemeStore } from '../settings/useThemeStore'

function getRuntimeMessage(event: RuntimeEvent, language: 'en' | 'zh-CN') {
  switch (event.type) {
    case 'connectionStateChanged':
      return getConnectionRuntimeMessage(event.state, language)
    case 'nodeDataChanged':
      return language === 'zh-CN'
        ? `数据已变更：${event.path}`
        : `Data changed: ${event.path}`
    case 'nodeChildrenChanged':
      return language === 'zh-CN'
        ? `子节点已变更：${event.path}`
        : `Children changed: ${event.path}`
    case 'nodeDeleted':
      return language === 'zh-CN'
        ? `节点已删除：${event.path}`
        : `Node deleted: ${event.path}`
  }
}

export function useRuntimeEvents() {
  const { connectionState, handleRuntimeEvent } = useConnectionsStore()
  const [watcherCount, setWatcherCount] = useState(0)
  const [lastEvent, setLastEvent] = useState<RuntimeEvent | null>(null)
  const { language } = useThemeStore()

  useEffect(() => {
    if (!window.zkube?.runtime.subscribe) {
      return undefined
    }

    const unsubscribe = window.zkube.runtime.subscribe((event) => {
      if (event.type === 'connectionStateChanged') {
        handleRuntimeEvent(event)
        setWatcherCount(0)
        setLastEvent(event)
        return
      }

      setWatcherCount((count) => count + 1)
      setLastEvent(event)
    })

    return typeof unsubscribe === 'function' ? unsubscribe : undefined
  }, [handleRuntimeEvent])

  return {
    connectionState,
    watcherCount,
    message: lastEvent ? getRuntimeMessage(lastEvent, language) : null,
  }
}
