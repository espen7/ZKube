import { useEffect } from 'react'

import { useI18n } from '../../use-i18n'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { NodeAclEditor } from './NodeAclEditor'
import { NodeEditor } from './NodeEditor'
import { NodeMetaPanel } from './NodeMetaPanel'
import { formatJson, formatXml } from './formatters'

export function NodeWorkbench() {
  const { t } = useI18n()
  const {
    activePath,
    tabs,
    setActiveTab,
    setActivePane,
    setDraft,
    setAcl,
    applyFormatter,
    handleRuntimeEvent,
    loadTab,
    saveTab,
  } = useWorkbenchStore()

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? null

  useEffect(() => {
    if (!activeTab || activeTab.loadState !== 'idle') {
      return
    }

    void loadTab(activeTab.path)
  }, [activeTab?.loadState, activeTab?.path, loadTab])

  useEffect(() => {
    if (!window.zkube?.runtime.subscribe) {
      return undefined
    }

    return window.zkube.runtime.subscribe((event) => {
      handleRuntimeEvent(event)
    })
  }, [handleRuntimeEvent])

  if (!activeTab) {
    return (
      <section aria-label="Node workbench" className="workspace-shell">
        <section className="workspace-card workspace-card--pane" aria-label="Empty node workbench">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">{t('workbench.eyebrow')}</div>
              <h2 className="panel__title">{t('workbench.title')}</h2>
            </div>
          </div>
          <div aria-label="Node workbench viewport" className="panel__body panel__body--scroll">
            <div className="placeholder-row">{t('workbench.empty')}</div>
          </div>
        </section>
      </section>
    )
  }

  return (
    <section aria-label="Node workbench" className="workspace-shell">
      <div className="workspace-stack">
        <section className="workspace-card workspace-card--chrome" aria-label="Open node tabs">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">{t('workbench.eyebrow')}</div>
              <h2 className="panel__title">{t('workbench.title')}</h2>
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

        <section className="workspace-card workspace-card--chrome" aria-label="Node pane switcher">
          <div className="panel__body">
            <div role="tablist" aria-label="Node panes">
              {([
                ['Data', t('editor.data')],
                ['Meta', t('meta.title')],
                ['ACL', t('acl.title')],
              ] as const).map(([pane, label]) => (
                <button
                  key={pane}
                  type="button"
                  aria-pressed={activeTab.activePane === pane}
                  onClick={() => setActivePane(activeTab.path, pane)}
                  style={{ marginRight: '8px' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div aria-label="Node workbench viewport" className="workspace-pane">
          {activeTab.activePane === 'Data' ? (
            <NodeEditor
              path={activeTab.path}
              value={activeTab.draft}
              error={activeTab.error}
              isLoading={activeTab.loadState === 'loading'}
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
            <NodeAclEditor
              path={activeTab.path}
              acl={activeTab.acl}
              onSaved={(acl) => setAcl(activeTab.path, acl)}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
