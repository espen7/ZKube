import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { NavigationToolRail } from './NavigationToolRail'
import { StatusBar } from '../runtime/StatusBar'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { useZooKeeperOverview } from '../runtime/useZooKeeperOverview'
import { TreePanel } from '../tree/TreePanel'
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useI18n } from '../../use-i18n'

const DEFAULT_NAVIGATION_WIDTH = 980
const MIN_NAVIGATION_WIDTH = 700
const MAX_NAVIGATION_WIDTH = 1180
const COMPACT_MIN_NAVIGATION_WIDTH = 560
const DESKTOP_STACK_BREAKPOINT = 1100
const WIDE_LAYOUT_BREAKPOINT = 1500
const WORKSPACE_MIN_WIDTH = 420
const RESIZER_WIDTH = 12
const GRID_GAP = 12
const APP_SHELL_HORIZONTAL_PADDING = 24

function getSafeNavigationWidth(width: number, viewportWidth: number) {
  if (viewportWidth <= DESKTOP_STACK_BREAKPOINT) {
    return Math.min(MAX_NAVIGATION_WIDTH, Math.max(MIN_NAVIGATION_WIDTH, width))
  }

  const reservedWidth =
    WORKSPACE_MIN_WIDTH +
    RESIZER_WIDTH +
    APP_SHELL_HORIZONTAL_PADDING +
    GRID_GAP * 2
  const maxWidth = Math.min(MAX_NAVIGATION_WIDTH, viewportWidth - reservedWidth)
  const minimumWidth =
    viewportWidth <= WIDE_LAYOUT_BREAKPOINT
      ? COMPACT_MIN_NAVIGATION_WIDTH
      : MIN_NAVIGATION_WIDTH

  if (maxWidth <= minimumWidth) {
    return Math.max(0, maxWidth)
  }

  return Math.min(maxWidth, Math.max(minimumWidth, width))
}

export function AppShell() {
  const { t } = useI18n()
  const { connectionState, watcherCount, message } = useRuntimeEvents()
  const overview = useZooKeeperOverview(connectionState)
  const {
    activeConnectionId,
    items,
    disconnectNoticeOpen,
    dismissDisconnectNotice,
  } = useConnectionsStore()
  const [navigationWidth, setNavigationWidth] = useState(() =>
    getSafeNavigationWidth(DEFAULT_NAVIGATION_WIDTH, window.innerWidth),
  )
  const dragOffsetRef = useRef<number | null>(null)
  const activeConnection =
    items.find((item) => item.id === activeConnectionId) ?? null

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragOffsetRef.current === null) {
        return
      }

      const nextWidth = getSafeNavigationWidth(
        event.clientX - dragOffsetRef.current,
        window.innerWidth,
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

  useEffect(() => {
    const handleResize = () => {
      setNavigationWidth((width) => getSafeNavigationWidth(width, window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
            setNavigationWidth((width) =>
              getSafeNavigationWidth(width - 24, window.innerWidth),
            )
          }
          if (event.key === 'ArrowRight') {
            setNavigationWidth((width) =>
              getSafeNavigationWidth(width + 24, window.innerWidth),
            )
          }
        }}
      />

      <main className="workspace">
        <NodeWorkbench />
      </main>

      <footer className="app-shell__footer">
        <StatusBar
          connectionState={connectionState}
          activeConnectionName={activeConnection?.name ?? null}
          activeConnectionHosts={activeConnection?.hosts ?? null}
          overview={overview}
          watcherCount={watcherCount}
          message={message}
        />
      </footer>

      <ConnectionDialog />

      {disconnectNoticeOpen ? (
        <div className="dialog-backdrop dialog-backdrop--overlay">
          <div
            aria-label={t('dialog.connectionLost')}
            aria-modal="true"
            className="dialog"
            role="dialog"
          >
            <h3>{t('dialog.connectionLost')}</h3>
            <p>{t('connection.lostDescription')}</p>
            <div className="dialog__actions">
              <button className="button-primary" type="button" onClick={dismissDisconnectNotice}>
                {t('dialog.ok')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
