import { useEffect, useState } from 'react'

import { Button, Menu, MenuItem, Tooltip } from '@mui/material'

import type { StoredConnection } from '../../../shared/models/connection'
import { MaterialSymbol } from '../../components/MaterialSymbol'
import { AppDialog } from '../../components/AppDialog'
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
    <Tooltip disableInteractive title={label}>
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
    </Tooltip>
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
                    setContextMenu({
                      connection: item,
                      x: event.clientX,
                      y: event.clientY,
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
                      <Button
                        aria-label={`disconnect connection ${item.name}`}
                        color="error"
                        size="small"
                        variant="contained"
                        onClick={() => void disconnect()}
                      >
                        {t('connection.disconnect')}
                      </Button>
                    ) : (
                      <Button
                        aria-label={
                          isPending
                            ? `connection pending ${item.name}`
                            : `connect connection ${item.name}`
                        }
                        disabled={transitionInFlight}
                        size="small"
                        variant="contained"
                        onClick={() => void connect(item.id)}
                      >
                        {isPending
                          ? t('connection.connecting')
                          : t('connection.connect')}
                      </Button>
                    )}
                  </div>

                  <Menu
                    anchorReference="anchorPosition"
                    anchorPosition={
                      contextMenu
                        ? { top: contextMenu.y, left: contextMenu.x }
                        : undefined
                    }
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    open={contextMenu?.connection.id === item.id}
                    onClose={() => setContextMenu(null)}
                  >
                    <MenuItem
                      disabled={editDisabled}
                      onClick={() => handleEdit(item)}
                    >
                      {t('connection.editAction')}
                    </MenuItem>
                    <MenuItem
                      disabled={deleteDisabled}
                      onClick={() => void handleDelete(item)}
                    >
                      {t('connection.deleteAction')}
                    </MenuItem>
                  </Menu>
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

      <AppDialog
        open={deleteConfirm !== null}
        ariaLabel={t(
          'connection.deleteConfirm',
          { name: deleteConfirm?.connection.name ?? '' },
        )}
        onClose={() => setDeleteConfirm(null)}
      >
        {deleteConfirm ? (
          <>
            <h3>{t('connection.deleteAction')}</h3>
            <p>
              {t('connection.deleteConfirm', {
                name: deleteConfirm.connection.name,
              })}
            </p>
            <div className="dialog__actions">
              <Button type="button" onClick={() => setDeleteConfirm(null)}>
                {t('dialog.cancel')}
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => void handleConfirmDelete()}
              >
                {t('connection.deleteAction')}
              </Button>
            </div>
          </>
        ) : null}
      </AppDialog>
    </aside>
  )
}
