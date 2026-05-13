import { useEffect } from 'react'

import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionSidebar() {
  const { items, load, connect, exportAll, openDialog } = useConnectionsStore()

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
          <button className="button-primary" type="button" onClick={openDialog}>
            新建连接
          </button>
          <button type="button" onClick={() => void exportAll()}>
            导出
          </button>
        </div>
      </div>
      <div className="panel__body">
        <div className="muted">已保存连接</div>
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
