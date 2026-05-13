import { useEffect } from 'react'

import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionSidebar() {
  const {
    items,
    load,
    connect,
    exportAll,
    openCreateDialog,
    openImportDialog,
    feedback,
    exportPreview,
  } = useConnectionsStore()

  useEffect(() => {
    void load()
  }, [])

  return (
    <aside className="panel sidebar" aria-label="连接侧栏">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Connections</div>
          <h2 className="panel__title">连接工作区</h2>
        </div>
        <div className="panel__actions">
          <button
            aria-label="create connection"
            className="button-primary"
            type="button"
            onClick={openCreateDialog}
          >
            新建连接
          </button>
          <button aria-label="import connections" type="button" onClick={openImportDialog}>
            导入 JSON
          </button>
          <button aria-label="export connections" type="button" onClick={() => void exportAll()}>
            导出
          </button>
        </div>
      </div>
      <div className="panel__body">
        <div className="muted">已保存连接</div>
        {feedback ? (
          <div aria-live="polite" className="sidebar-feedback" role="status">
            {feedback}
          </div>
        ) : null}
        {exportPreview ? (
          <pre className="export-preview">{exportPreview}</pre>
        ) : null}
        <div className="sidebar-list">
          {items.length === 0 ? (
            <div className="placeholder-row">还没有保存的连接，先创建一个开始吧。</div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="connection-card">
                <div>
                  <h3 className="connection-card__title">{item.name}</h3>
                  <p className="connection-card__meta">{item.hosts}</p>
                  {item.chroot ? (
                    <p className="connection-card__meta">{`Chroot: ${item.chroot}`}</p>
                  ) : null}
                </div>
                <div className="connection-card__footer">
                  <span className="muted">{`更新于 ${item.updatedAt.slice(0, 10)}`}</span>
                  <button
                    aria-label={`connect connection ${item.name}`}
                    className="button-primary"
                    type="button"
                    onClick={() => void connect(item.id)}
                  >
                    连接
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
