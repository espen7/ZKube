import { useEffect } from 'react'

import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { NodeEditor } from './NodeEditor'
import { NodeMetaPanel } from './NodeMetaPanel'
import { formatJson, formatXml } from './formatters'

export function NodeWorkbench() {
  const {
    activePath,
    tabs,
    defaultNodePath,
    ensureDefaultTab,
    setActiveTab,
    setActivePane,
    setDraft,
    applyFormatter,
    loadTab,
    saveTab,
  } = useWorkbenchStore()

  useEffect(() => {
    ensureDefaultTab()
  }, [])

  const activeTab =
    tabs.find((tab) => tab.path === activePath) ??
    tabs.find((tab) => tab.path === defaultNodePath)

  useEffect(() => {
    if (!activeTab || activeTab.hasLoaded || activeTab.loading) {
      return
    }

    void loadTab(activeTab.path)
  }, [activeTab])

  if (!activeTab) {
    return null
  }

  return (
    <section aria-label="Node workbench" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0,
        }}
      >
        <section className="workspace-card" aria-label="Open node tabs">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">Workbench</div>
              <h2 className="panel__title">Node tabs</h2>
            </div>
          </div>
          <div className="panel__body">
            <div role="tablist" aria-label="Open nodes">
              {tabs.map((tab) => (
                <button
                  key={tab.path}
                  type="button"
                  aria-pressed={tab.path === activeTab.path}
                  onClick={() => setActiveTab(tab.path)}
                  style={{ marginRight: '8px' }}
                >
                  {tab.path}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="workspace-card" aria-label="Node pane switcher">
          <div className="panel__body">
            <div role="tablist" aria-label="Node panes">
              {(['Data', 'Meta', 'ACL'] as const).map((pane) => (
                <button
                  key={pane}
                  type="button"
                  aria-pressed={activeTab.activePane === pane}
                  onClick={() => setActivePane(activeTab.path, pane)}
                  style={{ marginRight: '8px' }}
                >
                  {pane}
                </button>
              ))}
            </div>
          </div>
        </section>

        {activeTab.activePane === 'Data' ? (
          <NodeEditor
            path={activeTab.path}
            value={activeTab.draft}
            error={activeTab.error}
            isLoading={activeTab.loading}
            isSaving={activeTab.saving}
            onChange={(value) => setDraft(activeTab.path, value)}
            onFormatJson={() => applyFormatter(activeTab.path, formatJson)}
            onFormatXml={() => applyFormatter(activeTab.path, formatXml)}
            onSave={() => void saveTab(activeTab.path)}
          />
        ) : null}

        {activeTab.activePane === 'Meta' ? (
          <NodeMetaPanel
            path={activeTab.path}
            version={activeTab.stat.version}
            numChildren={activeTab.stat.numChildren}
          />
        ) : null}

        {activeTab.activePane === 'ACL' ? (
          <section className="workspace-card" aria-label="Node acl pane">
            <div className="panel__header">
              <div>
                <div className="panel__eyebrow">ACL</div>
                <h2 className="panel__title">{activeTab.path}</h2>
              </div>
            </div>
            <div className="panel__body">
              <p>ACL editor will arrive in Task 9.</p>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
