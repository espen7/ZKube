import { useEffect, useState } from 'react'

import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useTreeStore } from '../tree/useTreeStore'
import { useI18n } from '../../use-i18n'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { NodeAclEditor } from './NodeAclEditor'
import { NodeEditor } from './NodeEditor'
import { NodeMetaPanel } from './NodeMetaPanel'
import { formatJson, formatXml } from './formatters'

function getMarkOrder(
  [pathA]: [string, unknown],
  [pathB]: [string, unknown],
) {
  return pathA.localeCompare(pathB)
}

export function NodeWorkbench() {
  const { t } = useI18n()
  const { activeConnectionId } = useConnectionsStore()
  const { marksByPath, revealPath } = useTreeStore()
  const {
    activePath,
    tabs,
    openNode,
    setActivePane,
    setDraft,
    setAcl,
    applyFormatter,
    handleRuntimeEvent,
    loadTab,
    refreshTab,
    saveTab,
  } = useWorkbenchStore()
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false)

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? null
  const hasUnsavedChanges =
    activeTab !== null && activeTab.draft !== activeTab.savedDraft
  const markedNodes = activeConnectionId
    ? Object.entries(marksByPath).sort(getMarkOrder)
    : []

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

  useEffect(() => {
    if (!activeTab) {
      setRefreshConfirmOpen(false)
    }
  }, [activeTab?.path])

  async function handleRefreshNode() {
    if (!activeTab) {
      return
    }

    if (hasUnsavedChanges) {
      setRefreshConfirmOpen(true)
      return
    }

    await refreshTab(activeTab.path)
  }

  function handleMarkedNodeClick(path: string) {
    openNode(path)
    void revealPath(path)
  }

  return (
    <section aria-label="Node workbench" className="workspace-shell">
      <div className="workspace-stack">
        <section className="workspace-card workspace-card--chrome" aria-label="Marked nodes">
          <div className="panel__header">
            <div>
              <div className="panel__eyebrow">{t('workbench.eyebrow')}</div>
              <h2 className="panel__title">{t('workbench.markedNodes')}</h2>
            </div>
            <div className="panel__actions">
              <button
                type="button"
                disabled={!activeTab}
                onClick={() => void handleRefreshNode()}
              >
                {t('workbench.refreshNode')}
              </button>
            </div>
          </div>
          <div className="panel__body panel__body--scroll">
            {markedNodes.length > 0 ? (
              <div
                aria-label="Marked nodes list"
                className="workbench-mark-list"
                role="list"
              >
                {markedNodes.map(([path, color]) => (
                  <button
                    key={path}
                    type="button"
                    className={[
                      'workbench-mark-list__item',
                      activeTab?.path === path ? 'workbench-mark-list__item--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={activeTab?.path === path}
                    onClick={() => handleMarkedNodeClick(path)}
                    title={path}
                  >
                    <span
                      aria-hidden="true"
                      className={`tree-row__mark tree-row__mark--${color}`}
                    />
                    <span className="workbench-mark-list__path">{path}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="placeholder-row">{t('workbench.noMarkedNodes')}</div>
            )}
          </div>
        </section>

        {activeTab ? (
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
        ) : null}

        <div aria-label="Node workbench viewport" className="workspace-pane">
          {!activeTab ? (
            <section className="workspace-card workspace-card--pane" aria-label="Empty node workbench">
              <div className="panel__body panel__body--scroll">
                <div className="placeholder-row">{t('workbench.empty')}</div>
              </div>
            </section>
          ) : null}

          {activeTab?.activePane === 'Data' ? (
            <NodeEditor
              path={activeTab.path}
              value={activeTab.draft}
              error={activeTab.error}
              errorCode={activeTab.errorCode}
              isLoading={activeTab.loadState === 'loading'}
              isSaving={activeTab.saving}
              onChange={(value) => setDraft(activeTab.path, value)}
              onFormatJson={() => applyFormatter(activeTab.path, formatJson)}
              onFormatXml={() => applyFormatter(activeTab.path, formatXml)}
              onSave={() => void saveTab(activeTab.path)}
            />
          ) : null}

          {activeTab?.activePane === 'Meta' ? (
            <NodeMetaPanel
              path={activeTab.path}
              version={activeTab.stat.version}
              numChildren={activeTab.stat.numChildren}
              dataLength={activeTab.stat.dataLength}
              mtime={activeTab.stat.mtime}
            />
          ) : null}

          {activeTab?.activePane === 'ACL' ? (
            <NodeAclEditor
              path={activeTab.path}
              acl={activeTab.acl}
              onSaved={(acl) => setAcl(activeTab.path, acl)}
            />
          ) : null}
        </div>
      </div>

      {refreshConfirmOpen && activeTab ? (
        <div className="dialog-backdrop dialog-backdrop--overlay">
          <div
            aria-label={t('workbench.refreshConfirmTitle')}
            aria-modal="true"
            className="dialog"
            role="dialog"
          >
            <h3>{t('workbench.refreshConfirmTitle')}</h3>
            <p>{t('workbench.refreshConfirmDescription')}</p>
            <div className="dialog__actions">
              <button type="button" onClick={() => setRefreshConfirmOpen(false)}>
                {t('dialog.cancel')}
              </button>
              <button
                className="button-danger"
                type="button"
                onClick={() => {
                  setRefreshConfirmOpen(false)
                  void refreshTab(activeTab.path)
                }}
              >
                {t('workbench.discardAndRefresh')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
