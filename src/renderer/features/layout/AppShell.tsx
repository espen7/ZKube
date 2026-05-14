import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'
import { NavigationToolRail } from './NavigationToolRail'
import { StatusBar } from '../runtime/StatusBar'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { TreePanel } from '../tree/TreePanel'
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { useI18n } from '../../use-i18n'

export function AppShell() {
  const { connectionState, watcherCount, message } = useRuntimeEvents()
  const { t } = useI18n()

  return (
    <div className="app-shell">
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
          watcherCount={watcherCount}
          message={message}
        />
      </footer>

      <ConnectionDialog />
    </div>
  )
}
