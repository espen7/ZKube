import { useEffect, useState } from 'react'

import type { StoredConnection } from '../../../shared/models/connection'
import { useI18n } from '../../use-i18n'
import { ConnectionStateBadge } from '../runtime/ConnectionStateBadge'
import { useConnectionsStore } from './useConnectionsStore'

type ContextMenuState = {
  connection: StoredConnection
  x: number
  y: number
}

export function ConnectionSidebar() {
  const {
    items,
    load,
    connect,
    disconnect,
    deleteConnection,
    feedback,
    activeConnectionId,
    connectionState,
  } = useConnectionsStore()
  const { t } = useI18n()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

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

  const transitionInFlight =
    connectionState === 'connecting' || connectionState === 'reconnecting'

  function isDeleteDisabled(connectionId: string) {
    return activeConnectionId === connectionId && connectionState !== 'disconnected'
  }

  async function handleDelete(connection: StoredConnection) {
    if (isDeleteDisabled(connection.id)) {
      return
    }

    setContextMenu(null)

    const confirmed = window.confirm(
      t('connection.deleteConfirm', { name: connection.name }),
    )
    if (!confirmed) {
      return
    }

    await deleteConnection(connection.id)
  }

  return (
    <aside className="panel sidebar" aria-label="Connections sidebar">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('panel.connections')}</div>
          <h2 className="panel__title">{t('panel.connectionWorkspace')}</h2>
        </div>
      </div>
      <div className="panel__body sidebar__body">
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

              return (
                <article
                  key={item.id}
                  className="connection-card"
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
                      <button
                        aria-label={`disconnect connection ${item.name}`}
                        className="button-primary"
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
    </aside>
  )
}
