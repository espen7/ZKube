import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { TreePanel } from '../tree/TreePanel'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <h1>ZKube</h1>
          <p>ZooKeeper 桌面工作台</p>
        </div>
        <div className="muted">控制台骨架 / Task 6</div>
      </header>

      <div
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateRows: 'minmax(260px, 1fr) minmax(260px, 1fr)',
          minHeight: 0,
        }}
      >
        <ConnectionSidebar />
        <TreePanel />
      </div>

      <main className="workspace">
        <section className="workspace-card" aria-label="工作台主区域">
          <div className="panel__eyebrow">Workbench</div>
          <h2>准备连接并开始浏览集群</h2>
          <p>
            当前阶段先提供三栏桌面骨架、连接侧栏和占位工作台。树视图、节点编辑器和运行态反馈会在后续任务接入。
          </p>
          <div className="placeholder-list" aria-hidden="true">
            <div className="placeholder-row">节点树面板占位</div>
            <div className="placeholder-row">数据编辑器占位</div>
            <div className="placeholder-row">ACL / Meta 占位</div>
          </div>
        </section>
      </main>

      <aside className="panel inspector" aria-label="上下文侧栏">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">Inspector</div>
            <h2 className="panel__title">上下文占位</h2>
          </div>
        </div>
        <div className="panel__body">
          <div className="placeholder-row">连接详情</div>
          <div className="placeholder-row">最近操作</div>
          <div className="placeholder-row">状态反馈</div>
        </div>
      </aside>

      <footer className="app-shell__footer">
        <span>状态栏占位</span>
        <span>等待后续任务接入运行时事件</span>
      </footer>

      <ConnectionDialog />
    </div>
  )
}
