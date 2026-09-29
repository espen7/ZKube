import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { Dialog } from '@mui/material'

import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { MainHeader } from './MainHeader'
import { StatusBar } from '../runtime/StatusBar'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { useZooKeeperOverview } from '../runtime/useZooKeeperOverview'
import { TreePanel } from '../tree/TreePanel'
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useI18n } from '../../use-i18n'

const DEFAULT_TREE_WIDTH = 380
const MIN_TREE_WIDTH = 280
const MAX_TREE_WIDTH = 640
const SIDE_NAV_EXPANDED_WIDTH = 260
const WORKSPACE_MIN_WIDTH = 420
const RESIZER_WIDTH = 12
const APP_HORIZONTAL_PADDING = 24

function getSafeTreeWidth(width: number, viewportWidth: number) {
  const maxWidth = Math.min(
    MAX_TREE_WIDTH,
    viewportWidth -
      SIDE_NAV_EXPANDED_WIDTH -
      RESIZER_WIDTH -
      WORKSPACE_MIN_WIDTH -
      APP_HORIZONTAL_PADDING,
  )

  return Math.min(maxWidth, Math.max(MIN_TREE_WIDTH, width))
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
  const [treeWidth, setTreeWidth] = useState(() =>
    getSafeTreeWidth(DEFAULT_TREE_WIDTH, window.innerWidth),
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const dragOffsetRef = useRef<number | null>(null)
  const treePanelRef = useRef<HTMLElement | null>(null)
  const activeConnection =
    items.find((item) => item.id === activeConnectionId) ?? null

  useEffect(() => {
    if (connectionState === 'connected') {
      setSidebarCollapsed(true)
    } else if (connectionState === 'disconnected') {
      setSidebarCollapsed(false)
    }
  }, [connectionState])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragOffsetRef.current === null) {
        return
      }

      const treeLeft = treePanelRef.current?.getBoundingClientRect().left ?? 0
      const nextWidth = getSafeTreeWidth(
        event.clientX - dragOffsetRef.current - treeLeft,
        window.innerWidth,
      )
      setTreeWidth(nextWidth)
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
      setTreeWidth((width) => getSafeTreeWidth(width, window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const startDragging = (clientX: number) => {
    const treeLeft = treePanelRef.current?.getBoundingClientRect().left ?? 0
    dragOffsetRef.current = clientX - treeLeft - treeWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      aria-label="ZKube app shell"
      className="app-shell"
      style={{ '--tree-width': `${treeWidth}px` } as CSSProperties}
    >
      <MainHeader
        connectionState={connectionState}
        connectionName={activeConnection?.name ?? null}
        connectionHosts={activeConnection?.hosts ?? null}
      />

      <div aria-label="Navigation workspace" className="app-container">
        <ConnectionSidebar
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />
        <TreePanel containerRef={treePanelRef} />

        <div
          aria-label="Resize tree and workbench"
          className="layout-resizer"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          onMouseDown={(event) => startDragging(event.clientX)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              setTreeWidth((width) =>
                getSafeTreeWidth(width - 24, window.innerWidth),
              )
            }
            if (event.key === 'ArrowRight') {
              setTreeWidth((width) =>
                getSafeTreeWidth(width + 24, window.innerWidth),
              )
            }
          }}
        />

        <main className="workspace">
          <NodeWorkbench />
        </main>
      </div>

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

      <Dialog
        onClose={dismissDisconnectNotice}
        open={disconnectNoticeOpen}
        slotProps={{ paper: { 'aria-label': t('dialog.connectionLost') } }}
      >
        <div className="dialog__body">
          <h3>{t('dialog.connectionLost')}</h3>
          <p>{t('connection.lostDescription')}</p>
          <div className="dialog__actions">
            <button className="button-primary" type="button" onClick={dismissDisconnectNotice}>
              {t('dialog.ok')}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
