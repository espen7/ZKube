import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { NavigationToolRail } from './NavigationToolRail'
import { StatusBar } from '../runtime/StatusBar'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { TreePanel } from '../tree/TreePanel'
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { useI18n } from '../../use-i18n'
import { useConnectionsStore } from '../connections/useConnectionsStore'

const DEFAULT_NAVIGATION_WIDTH = 860
const MIN_NAVIGATION_WIDTH = 700
const MAX_NAVIGATION_WIDTH = 1180

export function AppShell() {
  const { connectionState, watcherCount, message } = useRuntimeEvents()
  const { activeConnectionId, items } = useConnectionsStore()
  const { t } = useI18n()
  const [navigationWidth, setNavigationWidth] = useState(DEFAULT_NAVIGATION_WIDTH)
  const dragOffsetRef = useRef<number | null>(null)
  const activeConnection =
    items.find((item) => item.id === activeConnectionId) ?? null

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragOffsetRef.current === null) {
        return
      }

      const nextWidth = Math.min(
        MAX_NAVIGATION_WIDTH,
        Math.max(MIN_NAVIGATION_WIDTH, event.clientX - dragOffsetRef.current),
      )
      setNavigationWidth(nextWidth)
    }

    const stopDragging = () => {
      dragOffsetRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDragging)
    }
  }, [])

  const startDragging = (clientX: number) => {
    dragOffsetRef.current = clientX - navigationWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      aria-label="ZKube app shell"
      className="app-shell"
      style={{ '--navigation-width': `${navigationWidth}px` } as CSSProperties}
    >
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <h1>ZKube</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="muted">{t('app.headerHint')}</div>
      </header>

      <section aria-label="Navigation workspace" className="navigation-workspace">
        <NavigationToolRail />
        <ConnectionSidebar />
        <TreePanel />
      </section>

      <div
        aria-label="Resize tree and workbench"
        className="layout-resizer"
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        onMouseDown={(event) => startDragging(event.clientX)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            setNavigationWidth((width) => Math.max(MIN_NAVIGATION_WIDTH, width - 24))
          }
          if (event.key === 'ArrowRight') {
            setNavigationWidth((width) => Math.min(MAX_NAVIGATION_WIDTH, width + 24))
          }
        }}
      />

      <main className="workspace">
        <NodeWorkbench />
      </main>

      <aside className="panel inspector" aria-label="Inspector sidebar">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">{t('panel.inspector')}</div>
            <h2 className="panel__title">{t('panel.contextPlaceholder')}</h2>
          </div>
        </div>
        <div aria-label="Inspector content" className="panel__body panel__body--scroll">
          <div className="placeholder-row">{t('panel.connectionDetails')}</div>
          <div className="placeholder-row">{t('panel.recentActions')}</div>
          <div className="placeholder-row">{t('panel.runtimeFeedback')}</div>
        </div>
      </aside>

      <footer className="app-shell__footer">
        <StatusBar
          connectionState={connectionState}
          activeConnectionName={activeConnection?.name ?? null}
          activeConnectionHosts={activeConnection?.hosts ?? null}
          watcherCount={watcherCount}
          message={message}
        />
      </footer>

      <ConnectionDialog />
    </div>
  )
}
