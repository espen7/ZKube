import { useEffect, useState } from 'react'

import type { StoredConnection } from '../../../shared/models/connection'
import { MaterialSymbol } from '../../components/MaterialSymbol'
import { useI18n } from '../../use-i18n'
import { AboutDialog } from '../layout/AboutDialog'
import { ConnectionStateBadge } from '../runtime/ConnectionStateBadge'
import { useConnectionsStore } from './useConnectionsStore'

type ContextMenuState = {
  connection: StoredConnection
  x: number
  y: number
}

type DeleteConfirmState = {
  connection: StoredConnection
}

function SideNavButton({
  label,
  onClick,
  icon,
  isActive = false,
}: {
  label: string
  onClick: () => void
  icon: string
  isActive?: boolean
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={isActive ? 'true' : 'false'}
      className={['side-nav__icon-btn', isActive ? 'side-nav__icon-btn--active' : '']
        .filter(Boolean)
        .join(' ')}
      type="button"
      onClick={onClick}
    >
      <MaterialSymbol name={icon} size={18} />
    </button>
  )
}

export function ConnectionSidebar({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean
  onToggleSidebar: () => void
}) {
  const {
    items,
    load,
    connect,
    disconnect,
    openCreateDialog,
    importFromFile,
    exportToFile,
    openEditDialog,
    deleteConnection,
    feedback,
    clearFeedback,
    activeConnectionId,
    connectionState,
  } = useConnectionsStore()
  const { t } = useI18n()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [version, setVersion] = useState('--')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!contextMenu) {
      return undefined
    }

    const handleWindowInteraction = () => {
      setContextMenu(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('click', handleWindowInteraction)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('click', handleWindowInteraction)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }

    const timer = setTimeout(() => {
      clearFeedback()
    }, 5000)

    return () => {
      clearTimeout(timer)
    }
  }, [feedback, clearFeedback])

  useEffect(() => {
    if (!aboutOpen) {
      setCopied(false)
      return
    }

    let cancelled = false

    void window.zkube?.app
      .getVersion()
      .then((result) => {
        if (!cancelled) {
          setVersion(result.version)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersion('--')
        }
      })

    return () => {
      cancelled = true
    }
  }, [aboutOpen])

  const transitionInFlight =
    connectionState === 'connecting' || connectionState === 'reconnecting'

  function isDeleteDisabled(connectionId: string) {
    return activeConnectionId === connectionId && connectionState !== 'disconnected'
  }

  function isEditDisabled(connectionId: string) {
    return activeConnectionId === connectionId && connectionState !== 'disconnected'
  }

  function calculateContextMenuPosition(clientX: number, clientY: number) {
    const menuWidth = 160
    const menuHeight = 80
    const padding = 8

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = clientX
    let y = clientY

    if (x + menuWidth + padding > viewportWidth) {
      x = viewportWidth - menuWidth - padding
    }

    if (y + menuHeight + padding > viewportHeight) {
      y = viewportHeight - menuHeight - padding
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) }
  }

  function handleEdit(connection: StoredConnection) {
    if (isEditDisabled(connection.id)) {
      return
    }

    setContextMenu(null)
    openEditDialog(connection.id)
  }

  function handleDelete(connection: StoredConnection) {
    if (isDeleteDisabled(connection.id)) {
      return
    }

    setContextMenu(null)
    setDeleteConfirm({ connection })
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) {
      return
    }

    setDeleteConfirm(null)
    await deleteConnection(deleteConfirm.connection.id)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText('https://github.com/espen7/ZKube')
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <aside
      aria-label="Navigation tools"
      className="side-nav"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className="side-nav__header">
        <SideNavButton
          isActive={!collapsed}
          label={t('tool.toggleConnections')}
          icon="left_panel_open"
          onClick={onToggleSidebar}
        />
        <SideNavButton
          label={t('tool.createConnection')}
          icon="add_box"
          onClick={openCreateDialog}
        />
        <SideNavButton
          label={t('tool.importConnections')}
          icon="download"
          onClick={() => {
            void importFromFile()
          }}
        />
        <SideNavButton
          label={t('tool.exportConnections')}
          icon="upload"
          onClick={() => {
            void exportToFile()
          }}
        />
      </div>

      <div aria-label="Connections sidebar" className="side-nav__body">
        <div className="muted">{t('panel.savedConnections')}</div>
        {feedback ? (
          <div aria-live="polite" className="sidebar-feedback" role="status">
            {feedback}
          </div>
        ) : null}
        <div aria-label="Saved connections list" className="sidebar-list">
          {items.length === 0 ? (
            <div className="placeholder-row">{t('connection.none')}</div>
          ) : (
            items.map((item) => {
              const isActive = activeConnectionId === item.id
              const isHealthy = isActive && connectionState === 'connected'
              const isPending = isActive && transitionInFlight
              const deleteDisabled = isDeleteDisabled(item.id)
              const editDisabled = isEditDisabled(item.id)

              return (
                <article
                  key={item.id}
                  className={[
                    'connection-card',
                    isActive ? 'connection-card--active' : '',
                    isHealthy ? 'connection-card--healthy' : '',
                    isPending ? 'connection-card--pending' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    const position = calculateContextMenuPosition(event.clientX, event.clientY)
                    setContextMenu({
                      connection: item,
                      x: position.x,
                      y: position.y,
                    })
                  }}
                >
                  <div>
                    <h3 className="connection-card__title">{item.name}</h3>
                    <p className="connection-card__meta">{item.hosts}</p>
                    {item.chroot ? (
                      <p className="connection-card__meta">{`Chroot: ${item.chroot}`}</p>
                    ) : null}
                  </div>
                  <div className="connection-card__footer">
                    <div className="connection-card__footer-meta">
                      {isActive ? (
                        <ConnectionStateBadge
                          ariaLabel={`Connection health ${item.name}`}
                          state={connectionState}
                        />
                      ) : (
                        <span className="muted">
                          {t('connection.updated', {
                            date: item.updatedAt.slice(0, 10),
                          })}
                        </span>
                      )}
                    </div>
                    {isHealthy ? (
                      <button
                        aria-label={`disconnect connection ${item.name}`}
                        className="button-danger"
                        type="button"
                        onClick={() => void disconnect()}
                      >
                        {t('connection.disconnect')}
                      </button>
                    ) : (
                      <button
                        aria-label={
                          isPending
                            ? `connection pending ${item.name}`
                            : `connect connection ${item.name}`
                        }
                        className="button-primary"
                        disabled={transitionInFlight}
                        type="button"
                        onClick={() => void connect(item.id)}
                      >
                        {isPending
                          ? t('connection.connecting')
                          : t('connection.connect')}
                      </button>
                    )}
                  </div>

                  {contextMenu?.connection.id === item.id ? (
                    <div
                      className="context-menu"
                      role="menu"
                      style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                    >
                      <button
                        aria-disabled={editDisabled ? 'true' : 'false'}
                        className="context-menu__item"
                        role="menuitem"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleEdit(item)
                        }}
                      >
                        {t('connection.editAction')}
                      </button>
                      <button
                        aria-disabled={deleteDisabled ? 'true' : 'false'}
                        className="context-menu__item"
                        role="menuitem"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (deleteDisabled) {
                            return
                          }

                          void handleDelete(item)
                        }}
                      >
                        {t('connection.deleteAction')}
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </div>
      </div>

      <div className="side-nav__footer">
        <SideNavButton
          label={t('tool.openSettings')}
          icon="settings"
          onClick={() => {
            void window.zkube?.preferences?.openSettingsWindow()
          }}
        />
        <SideNavButton
          label={t('tool.about')}
          icon="info"
          onClick={() => {
            setAboutOpen(true)
          }}
        />
      </div>

      <AboutDialog
        open={aboutOpen}
        version={version}
        copied={copied}
        onClose={() => setAboutOpen(false)}
        onCopy={() => {
          void handleCopyLink()
        }}
      />

      {deleteConfirm ? (
        <div className="dialog-backdrop dialog-backdrop--overlay">
          <div
            aria-label={t('connection.deleteConfirm', { name: deleteConfirm.connection.name })}
            aria-modal="true"
            className="dialog"
            role="dialog"
          >
            <h3>{t('connection.deleteAction')}</h3>
            <p>{t('connection.deleteConfirm', { name: deleteConfirm.connection.name })}</p>
            <div className="dialog__actions">
              <button type="button" onClick={() => setDeleteConfirm(null)}>
                {t('dialog.cancel')}
              </button>
              <button
                className="button-danger"
                type="button"
                onClick={() => void handleConfirmDelete()}
              >
                {t('connection.deleteAction')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
