import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { StatusBar } from '../runtime/StatusBar'
import { ToastRegion } from '../runtime/ToastRegion'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { TreePanel } from '../tree/TreePanel'
import { NodeWorkbench } from '../workbench/NodeWorkbench'

export function AppShell() {
  const { connectionState, watcherCount, message } = useRuntimeEvents()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <h1>ZKube</h1>
          <p>ZooKeeper desktop workbench</p>
        </div>
        <div className="muted">Control center shell / Task 8</div>
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
        <NodeWorkbench />
      </main>

      <aside className="panel inspector" aria-label="Inspector sidebar">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">Inspector</div>
            <h2 className="panel__title">Context placeholder</h2>
          </div>
        </div>
        <div className="panel__body">
          <div className="placeholder-row">Connection details</div>
          <div className="placeholder-row">Recent actions</div>
          <div className="placeholder-row">Runtime feedback</div>
        </div>
      </aside>

      <footer className="app-shell__footer">
        <StatusBar
          connectionState={connectionState}
          watcherCount={watcherCount}
          message={message}
        />
      </footer>

      <ToastRegion message={message} />
      <ConnectionDialog />
    </div>
  )
}
