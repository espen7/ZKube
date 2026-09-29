import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import { Button, Menu, MenuItem, Tab, Tabs } from '@mui/material'

import type { NodeMarkColor } from '../../../shared/models/node'

import { AppDialog } from '../../components/AppDialog'
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

type MarkContextMenuState = {
  path: string
  color: NodeMarkColor
  x: number
  y: number
}

export function NodeWorkbench() {
  const { t } = useI18n()
  const { activeConnectionId } = useConnectionsStore()
  const {
    marksByPath,
    clearNodeMark,
    hasNodePath,
    revealPath,
    setFeedback,
  } = useTreeStore()
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
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [markContextMenu, setMarkContextMenu] =
    useState<MarkContextMenuState | null>(null)

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

  function handleSaveClick() {
    if (!activeTab) {
      return
    }

    setSaveConfirmOpen(true)
  }

  async function handleConfirmSave() {
    if (!activeTab) {
      return
    }

    setSaveConfirmOpen(false)
    await saveTab(activeTab.path)
  }

  async function handleMarkedNodeClick(path: string) {
    const nodeExists = await hasNodePath(path)

    if (!nodeExists) {
      setFeedback(t('workbench.markedNodeMissing'))
      return
    }

    setFeedback(null)
    openNode(path)
    void revealPath(path)
  }

  function handleMarkedNodeContextMenu(
    event: MouseEvent<HTMLButtonElement>,
    path: string,
    color: NodeMarkColor,
  ) {
    event.preventDefault()
    setMarkContextMenu({
      path,
      color,
      x: event.clientX,
      y: event.clientY,
    })
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
                    onClick={() => void handleMarkedNodeClick(path)}
                    onContextMenu={(event) =>
                      handleMarkedNodeContextMenu(event, path, color)
                    }
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
              <Tabs
                aria-label="Node panes"
                className="segmented segmented--pane"
                value={activeTab.activePane}
                onChange={(_event, value: 'Data' | 'Meta' | 'ACL') =>
                  setActivePane(activeTab.path, value)
                }
              >
                {(
                  [
                    ['Data', 'editor.data'],
                    ['Meta', 'meta.title'],
                    ['ACL', 'acl.title'],
                  ] as const
                ).map(([pane, messageKey]) => (
                  <Tab
                    key={pane}
                    disableRipple
                    value={pane}
                    label={t(messageKey)}
                  />
                ))}
              </Tabs>
            </div>
          </section>
        ) : null}

        <div aria-label="Node workbench viewport" className="workspace-pane">
          {!activeTab ? (
            <div className="workspace-pane__placeholder" aria-label="Empty workbench placeholder">
              <strong>{t('workbench.emptyTitle')}</strong>
              <span>{t('workbench.empty')}</span>
            </div>
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
              onSave={handleSaveClick}
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

      <Menu
        anchorReference="anchorPosition"
        anchorPosition={
          markContextMenu
            ? { top: markContextMenu.y, left: markContextMenu.x }
            : undefined
        }
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={markContextMenu !== null}
        onClose={() => setMarkContextMenu(null)}
      >
        {markContextMenu ? (
          <MenuItem
            onClick={() => {
              setMarkContextMenu(null)
              void clearNodeMark(activeConnectionId, markContextMenu.path)
            }}
          >
            {t('workbench.removeMark')}
          </MenuItem>
        ) : null}
      </Menu>

      <AppDialog
        open={refreshConfirmOpen && activeTab !== null}
        ariaLabel={t('workbench.refreshConfirmTitle')}
        onClose={() => setRefreshConfirmOpen(false)}
      >
        {activeTab ? (
          <div className="dialog__body">
            <h3>{t('workbench.refreshConfirmTitle')}</h3>
            <p>{t('workbench.refreshConfirmDescription')}</p>
            <div className="dialog__actions">
              <Button type="button" onClick={() => setRefreshConfirmOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => {
                  setRefreshConfirmOpen(false)
                  void refreshTab(activeTab.path)
                }}
              >
                {t('workbench.discardAndRefresh')}
              </Button>
            </div>
          </div>
        ) : null}
      </AppDialog>

      <AppDialog
        open={saveConfirmOpen && activeTab !== null}
        ariaLabel={t('workbench.saveConfirmTitle')}
        onClose={() => setSaveConfirmOpen(false)}
      >
        {activeTab ? (
          <div className="dialog__body">
            <h3>{t('workbench.saveConfirmTitle')}</h3>
            <p>{t('workbench.saveConfirmDescription')}</p>
            <div className="dialog__actions">
              <Button type="button" onClick={() => setSaveConfirmOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button variant="contained" onClick={() => void handleConfirmSave()}>
                {t('workbench.confirmSave')}
              </Button>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </section>
  )
}
