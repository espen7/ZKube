import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { LucideIcon } from '../../components/LucideIcon'
import type {
  NodeMarkColor,
  TreeNodeRow,
} from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { TreeSearchBar } from './TreeSearchBar'
import { formatBytesCompact, formatRelativeTimeCompact } from './tree-formatters'
import { useTreeStore } from './useTreeStore'

type TreeBranchProps = {
  row: TreeNodeRow
  depth: number
  visibleIndexRef: { value: number }
  expandedPaths: string[]
  rowsByPath: Record<string, TreeNodeRow[]>
  marksByPath: Record<string, NodeMarkColor>
  query: string
  activePath: string | null
  hoveredPath: string | null
  registerRowRef: (path: string, element: HTMLDivElement | null) => void
  onToggle: (path: string) => void
  onOpen: (path: string) => void
  onHover: (path: string | null) => void
  onQuickDelete: (row: TreeNodeRow) => void
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
    <LucideIcon name="folder">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
    </LucideIcon>
  )
}

function RootIcon() {
  return (
    <LucideIcon name="hard-drive">
      <line x1="22" x2="2" y1="12" y2="12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      <line x1="6" x2="6.01" y1="16" y2="16" />
      <line x1="10" x2="10.01" y1="16" y2="16" />
    </LucideIcon>
  )
}

function FileIcon() {
  return (
    <LucideIcon name="file">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </LucideIcon>
  )
}

function DeleteIcon() {
  return (
    <LucideIcon name="trash-2">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </LucideIcon>
  )
}

function TreeBranch({
  row,
  depth,
  visibleIndexRef,
  expandedPaths,
  rowsByPath,
  marksByPath,
  query,
  activePath,
  hoveredPath,
  registerRowRef,
  onToggle,
  onOpen,
  onHover,
  onQuickDelete,
  onContextMenu,
}: TreeBranchProps) {
  const { t } = useI18n()

  if (!shouldRenderPath(row.path, query, rowsByPath)) {
    return null
  }

  const childRows = rowsByPath[row.path] ?? []
  const isExpanded = expandedPaths.includes(row.path)
  const isSelected = activePath === row.path
  const isHovered = hoveredPath === row.path
  const isLeafQuickDelete = !row.hasChildren && row.path !== '/'
  const isRootRow = row.path === '/'
  const visibleIndex = visibleIndexRef.value
  visibleIndexRef.value += 1
  const rowClassName = [
    'tree-row',
    visibleIndex % 2 === 0 ? 'tree-row--odd' : 'tree-row--even',
    isRootRow ? 'tree-row--root' : '',
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
        data-tree-path={row.path}
        role="button"
        ref={(element) => registerRowRef(row.path, element)}
        tabIndex={0}
        onClick={() => onOpen(row.path)}
        onContextMenu={(event) => onContextMenu(event, row)}
        onMouseEnter={() => onHover(row.path)}
        onMouseLeave={() => onHover(null)}
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
            {isRootRow ? (
              <RootIcon />
            ) : row.hasChildren ? (
              <FolderIcon />
            ) : (
              <FileIcon />
            )}
          </span>
          <span
            className={[
              'tree-row__open',
              isRootRow ? 'tree-row__open--root' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={row.path}
          >
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
        <div className="tree-row__size">{formatBytesCompact(row.dataLength)}</div>
        <div className="tree-row__updated">{formatRelativeTimeCompact(row.mtime)}</div>
        <div className="tree-row__action">
          {isLeafQuickDelete && isHovered ? (
            <button
              aria-label={t('tree.deleteNode')}
              className="tree-row__delete"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onQuickDelete(row)
              }}
            >
              <DeleteIcon />
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded && childRows.length > 0 ? (
        <ul className="tree-list tree-list--nested">
          {childRows.map((childRow) => (
            <TreeBranch
              key={childRow.path}
              row={childRow}
              depth={depth + 1}
              visibleIndexRef={visibleIndexRef}
              expandedPaths={expandedPaths}
              rowsByPath={rowsByPath}
              marksByPath={marksByPath}
              query={query}
              activePath={activePath}
              hoveredPath={hoveredPath}
              registerRowRef={registerRowRef}
              onToggle={onToggle}
              onOpen={onOpen}
              onHover={onHover}
              onQuickDelete={onQuickDelete}
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
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const rootLoaded = Object.prototype.hasOwnProperty.call(rowsByPath, '/')
  const rootRows = rowsByPath['/'] ?? []
  const rootRow: TreeNodeRow = {
    path: '/',
    name: '/',
    hasChildren: rootRows.length > 0,
    dataLength: null,
    mtime: null,
  }
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
      setHoveredPath(null)
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

  useEffect(() => {
    if (!activePath) {
      return
    }

    const activeRow = rowRefs.current[activePath]
    if (!activeRow) {
      return
    }

    if (typeof activeRow.scrollIntoView !== 'function') {
      return
    }

    activeRow.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    })
  }, [activePath, expandedPaths, rowsByPath])

  const markOptions: NodeMarkColor[] = ['red', 'orange', 'yellow', 'green']

  function registerRowRef(path: string, element: HTMLDivElement | null) {
    rowRefs.current[path] = element
  }

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

  function handleQuickDelete(row: TreeNodeRow) {
    setHoveredPath(null)
    setContextMenu(null)
    setDeleteDialog({ row })
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

  const visibleIndexRef = { value: 0 }

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
            <span aria-hidden="true" className="tree-grid__action-header" />
          </div>

          {loadingPaths.includes('/') ? (
            <div className="muted">{t('tree.loadingRoot')}</div>
          ) : null}

          {!rootLoaded ? (
            <div className="placeholder-row">{t('tree.loadRootHint')}</div>
          ) : (
            <ul aria-label="Loaded tree nodes" className="tree-list">
              <TreeBranch
                row={rootRow}
                depth={0}
                visibleIndexRef={visibleIndexRef}
                expandedPaths={expandedPaths}
                rowsByPath={{
                  ...rowsByPath,
                  '/': rootVisible,
                }}
                marksByPath={marksByPath}
                query={query}
                activePath={activePath}
                hoveredPath={hoveredPath}
                registerRowRef={registerRowRef}
                onToggle={toggleNode}
                onOpen={openNode}
                onHover={setHoveredPath}
                onQuickDelete={handleQuickDelete}
                onContextMenu={handleTreeContextMenu}
              />
              {rootVisible.length === 0 ? (
                <li className="placeholder-row">{t('tree.noLoadedNodes')}</li>
              ) : null}
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
