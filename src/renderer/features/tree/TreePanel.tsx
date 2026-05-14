import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import type {
  NodeMarkColor,
  TreeNodeRow,
} from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { TreeSearchBar } from './TreeSearchBar'
import { formatBytes, formatRelativeTime } from './tree-formatters'
import { useTreeStore } from './useTreeStore'

type TreeBranchProps = {
  row: TreeNodeRow
  depth: number
  expandedPaths: string[]
  rowsByPath: Record<string, TreeNodeRow[]>
  marksByPath: Record<string, NodeMarkColor>
  query: string
  activePath: string | null
  onToggle: (path: string) => void
  onOpen: (path: string) => void
  onContextMenu: (event: MouseEvent<HTMLDivElement>, row: TreeNodeRow) => void
}

type TreeContextMenuState = {
  row: TreeNodeRow
  x: number
  y: number
}

type CreateDialogState = {
  parentPath: string
}

type DeleteDialogState = {
  row: TreeNodeRow
}

function shouldRenderPath(
  path: string,
  query: string,
  rowsByPath: Record<string, TreeNodeRow[]>,
): boolean {
  if (!query) {
    return true
  }

  if (path.toLowerCase().includes(query.toLowerCase())) {
    return true
  }

  const rows = rowsByPath[path] ?? []
  return rows.some((row) => shouldRenderPath(row.path, query, rowsByPath))
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M2.5 6.5a1.5 1.5 0 0 1 1.5-1.5h3.1l1.3 1.5h7.6a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M5 3.5h7l3 3v10a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16.5V5A1.5 1.5 0 0 1 5.5 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M12 3.5V7h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function TreeBranch({
  row,
  depth,
  expandedPaths,
  rowsByPath,
  marksByPath,
  query,
  activePath,
  onToggle,
  onOpen,
  onContextMenu,
}: TreeBranchProps) {
  const { t } = useI18n()

  if (!shouldRenderPath(row.path, query, rowsByPath)) {
    return null
  }

  const childRows = rowsByPath[row.path] ?? []
  const isExpanded = expandedPaths.includes(row.path)
  const isSelected = activePath === row.path
  const rowClassName = [
    'tree-row',
    isSelected ? 'tree-row--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const markColor = marksByPath[row.path]

  return (
    <li className="tree-row-wrapper">
      <div
        aria-label={`Open node ${row.path}`}
        className={rowClassName}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row.path)}
        onContextMenu={(event) => onContextMenu(event, row)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(row.path)
          }
        }}
      >
        <div
          className="tree-row__node"
          style={{ paddingLeft: `${depth * 18}px` }}
        >
          {row.hasChildren ? (
            <button
              aria-label={isExpanded ? t('tree.collapse') : t('tree.expand')}
              className="tree-row__toggle"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void onToggle(row.path)
              }}
            >
              {isExpanded ? 'v' : '>'}
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="tree-row__toggle tree-row__toggle--placeholder"
            >
              .
            </span>
          )}
          <span aria-hidden="true" className="tree-row__icon">
            {row.hasChildren ? <FolderIcon /> : <FileIcon />}
          </span>
          <span className="tree-row__open" title={row.path}>
            {row.name}
          </span>
          {markColor ? (
            <span
              aria-label={`${markColor} node mark`}
              className={`tree-row__mark tree-row__mark--${markColor}`}
              title={`${markColor} mark`}
            />
          ) : null}
        </div>
        <div className="tree-row__size">{formatBytes(row.dataLength)}</div>
        <div className="tree-row__updated">{formatRelativeTime(row.mtime)}</div>
      </div>
      {isExpanded && childRows.length > 0 ? (
        <ul className="tree-list tree-list--nested">
          {childRows.map((childRow) => (
            <TreeBranch
              key={childRow.path}
              row={childRow}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              rowsByPath={rowsByPath}
              marksByPath={marksByPath}
              query={query}
              activePath={activePath}
              onToggle={onToggle}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function CreateChildNodeDialog(props: {
  parentPath: string
  onCancel: () => void
  onSubmit: (childName: string, initialData: string) => Promise<void>
}) {
  const { t } = useI18n()
  const { parentPath, onCancel, onSubmit } = props
  const [childName, setChildName] = useState('')
  const [initialData, setInitialData] = useState('')

  return (
    <div className="dialog-backdrop">
      <form
        aria-label="Create child node"
        aria-modal="true"
        className="dialog"
        role="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(childName, initialData)
        }}
      >
        <h3>{t('tree.createChildNode')}</h3>
        <p>{t('tree.createChildDescription', { path: parentPath })}</p>

        <label className="dialog__field">
          <span>{t('tree.childName')}</span>
          <input
            aria-label="child node name"
            type="text"
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
          />
        </label>

        <label className="dialog__field">
          <span>{t('tree.initialData')}</span>
          <textarea
            aria-label="child node data"
            rows={5}
            value={initialData}
            onChange={(event) => setInitialData(event.target.value)}
          />
        </label>

        <div className="dialog__actions">
          <button type="button" onClick={onCancel}>
            {t('dialog.cancel')}
          </button>
          <button className="button-primary" type="submit">
            {t('tree.createChildNode')}
          </button>
        </div>
      </form>
    </div>
  )
}

function DeleteNodeDialog(props: {
  row: TreeNodeRow
  onCancel: () => void
  onDeleteNodeOnly: () => Promise<void>
  onDeleteSubtree: () => Promise<void>
}) {
  const { t } = useI18n()
  const { row, onCancel, onDeleteNodeOnly, onDeleteSubtree } = props

  return (
    <div className="dialog-backdrop">
      <div
        aria-label="Delete node confirmation"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <h3>{t('tree.deleteNode')}</h3>
        <p>{t('tree.deleteNodeDescription', { path: row.path })}</p>
        {row.hasChildren ? (
          <p>{t('tree.deleteSubtreeDescription')}</p>
        ) : null}

        <div className="dialog__actions">
          <button type="button" onClick={onCancel}>
            {t('dialog.cancel')}
          </button>
          <button
            className="button-danger"
            type="button"
            onClick={() => void onDeleteNodeOnly()}
          >
            {t('tree.deleteNodeOnly')}
          </button>
          {row.hasChildren ? (
            <button
              className="button-danger"
              type="button"
              onClick={() => void onDeleteSubtree()}
            >
              {t('tree.deleteSubtree')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function TreePanel() {
  const { t } = useI18n()
  const activePath = useWorkbenchStore((store) => store.activePath)
  const openNode = useWorkbenchStore((store) => store.openNode)
  const { activeConnectionId, connectionState } = useConnectionsStore()
  const {
    rowsByPath,
    marksByPath,
    expandedPaths,
    loadingPaths,
    query,
    searchResults,
    feedback,
    loadRoot,
    refreshTree,
    toggleNode,
    setQuery,
    runDeepSearch,
    loadNodeMarks,
    clearNodeMarksState,
    setNodeMark,
    clearNodeMark,
    createChildNode,
    deleteNode,
    handleRuntimeEvent,
  } = useTreeStore()
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialogState | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)

  const rootRows = rowsByPath['/'] ?? []
  const rootVisible = !query
    ? rootRows
    : rootRows.filter((row) => shouldRenderPath(row.path, query, rowsByPath))

  useEffect(() => {
    if (!window.zkube?.runtime.subscribe) {
      return undefined
    }

    return window.zkube.runtime.subscribe((event) => {
      void handleRuntimeEvent(event)
    })
  }, [handleRuntimeEvent])

  useEffect(() => {
    if (!activeConnectionId || connectionState === 'disconnected') {
      clearNodeMarksState()
      setContextMenu(null)
      setCreateDialog(null)
      setDeleteDialog(null)
      return
    }

    void loadNodeMarks(activeConnectionId)
  }, [
    activeConnectionId,
    clearNodeMarksState,
    connectionState,
    loadNodeMarks,
  ])

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

  const markOptions: NodeMarkColor[] = ['red', 'orange', 'yellow', 'green']

  async function handleCreateSubmit(childName: string, initialData: string) {
    if (!createDialog) {
      return
    }

    const created = await createChildNode(
      createDialog.parentPath,
      childName,
      initialData,
    )
    if (created) {
      setCreateDialog(null)
    }
  }

  async function handleDeleteNodeOnly() {
    if (!deleteDialog) {
      return
    }

    const deleted = await deleteNode(deleteDialog.row.path)
    if (deleted) {
      setDeleteDialog(null)
    }
  }

  async function handleDeleteSubtree() {
    if (!deleteDialog) {
      return
    }

    const deleted = await deleteNode(deleteDialog.row.path, { recursive: true })
    if (deleted) {
      setDeleteDialog(null)
    }
  }

  function handleTreeContextMenu(
    event: MouseEvent<HTMLDivElement>,
    row: TreeNodeRow,
  ) {
    event.preventDefault()
    setContextMenu({
      row,
      x: event.clientX,
      y: event.clientY,
    })
  }

  return (
    <aside className="panel tree-panel" aria-label={t('panel.nodes')}>
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('panel.tree')}</div>
          <h2 className="panel__title">{t('panel.nodes')}</h2>
        </div>
        <div className="panel__actions">
          <button type="button" onClick={() => openNode('/')}>
            {t('tree.openRoot')}
          </button>
          <button type="button" onClick={() => void loadRoot()}>
            {t('tree.loadRoot')}
          </button>
          <button type="button" onClick={() => void refreshTree()}>
            {t('tree.refreshTree')}
          </button>
        </div>
      </div>
      <div className="panel__body tree-panel__body">
        <TreeSearchBar
          query={query}
          onQueryChange={setQuery}
          onDeepSearch={() => void runDeepSearch()}
        />
        <div aria-label="Tree content region" className="tree-panel__content">
          {feedback ? (
            <div className="sidebar-feedback" role="status">
              {feedback}
            </div>
          ) : null}

          <div className="tree-grid__header" role="presentation">
            <span role="columnheader">{t('tree.columnNode')}</span>
            <span role="columnheader">{t('tree.columnSize')}</span>
            <span role="columnheader">{t('tree.columnUpdated')}</span>
          </div>

          {loadingPaths.includes('/') ? (
            <div className="muted">{t('tree.loadingRoot')}</div>
          ) : null}

          {rootRows.length === 0 ? (
            <div className="placeholder-row">{t('tree.loadRootHint')}</div>
          ) : (
            <ul aria-label="Loaded tree nodes" className="tree-list">
              {rootVisible.length === 0 ? (
                <li className="placeholder-row">{t('tree.noLoadedNodes')}</li>
              ) : (
                rootVisible.map((row) => (
                  <TreeBranch
                    key={row.path}
                    row={row}
                    depth={0}
                    expandedPaths={expandedPaths}
                    rowsByPath={rowsByPath}
                    marksByPath={marksByPath}
                    query={query}
                    activePath={activePath}
                    onToggle={toggleNode}
                    onOpen={openNode}
                    onContextMenu={handleTreeContextMenu}
                  />
                ))
              )}
            </ul>
          )}

          {searchResults.length > 0 ? (
            <div>
              <div className="muted">{t('tree.searchResults')}</div>
              <ul aria-label="Deep search results" className="sidebar-list">
                {searchResults.map((path) => (
                  <li key={path} className="placeholder-row">
                    <button type="button" onClick={() => openNode(path)}>
                      {path}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {contextMenu ? (
        <div
          className="context-menu"
          role="menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button
            className="context-menu__item"
            role="menuitem"
            type="button"
            onClick={() => {
              setContextMenu(null)
              setCreateDialog({ parentPath: contextMenu.row.path })
            }}
          >
            {t('tree.createChildNode')}
          </button>
          {contextMenu.row.path !== '/' ? (
            <button
              className="context-menu__item"
              role="menuitem"
              type="button"
              onClick={() => {
                setContextMenu(null)
                setDeleteDialog({ row: contextMenu.row })
              }}
            >
              {t('tree.deleteNode')}
            </button>
          ) : null}
          <div className="context-menu__mark-row">
            <span className="context-menu__label">{t('tree.markNode')}</span>
            <div className="context-menu__swatches" role="group" aria-label={t('tree.markNode')}>
              {markOptions.map((color) => {
                const isSelected = marksByPath[contextMenu.row.path] === color

                return (
                  <button
                    key={color}
                    aria-label={`${color} node mark`}
                    aria-pressed={isSelected}
                    className={[
                      'context-menu__swatch',
                      `context-menu__swatch--${color}`,
                      isSelected ? 'context-menu__swatch--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="menuitemradio"
                    type="button"
                    onClick={() => {
                      setContextMenu(null)
                      if (isSelected) {
                        void clearNodeMark(activeConnectionId, contextMenu.row.path)
                        return
                      }

                      void setNodeMark(activeConnectionId, contextMenu.row.path, color)
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {createDialog ? (
        <CreateChildNodeDialog
          parentPath={createDialog.parentPath}
          onCancel={() => setCreateDialog(null)}
          onSubmit={handleCreateSubmit}
        />
      ) : null}

      {deleteDialog ? (
        <DeleteNodeDialog
          row={deleteDialog.row}
          onCancel={() => setDeleteDialog(null)}
          onDeleteNodeOnly={handleDeleteNodeOnly}
          onDeleteSubtree={handleDeleteSubtree}
        />
      ) : null}
    </aside>
  )
}
