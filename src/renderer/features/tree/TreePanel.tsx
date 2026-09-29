import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { Button, Menu, MenuItem, TextField, Tooltip } from '@mui/material'

import { MaterialSymbol } from '../../components/MaterialSymbol'
import { AppDialog } from '../../components/AppDialog'
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
  return <MaterialSymbol name="folder" size={16} />
}

function RootIcon() {
  return <MaterialSymbol name="storage" size={16} />
}

function FileIcon() {
  return <MaterialSymbol name="draft" size={16} />
}

function DeleteIcon() {
  return <MaterialSymbol name="delete" size={16} />
}

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return <MaterialSymbol name="refresh" size={16} className={spinning ? 'icon--spin' : undefined} />
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
        onDoubleClick={() => {
          if (row.hasChildren) {
            void onToggle(row.path)
          }
        }}
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
              className={[
                'tree-row__toggle',
                isExpanded ? 'tree-row__toggle--expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void onToggle(row.path)
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 4.5l5.5 5.5L6 15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="tree-row__toggle tree-row__toggle--placeholder"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="1.2" fill="currentColor" />
              </svg>
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
            {row.isEphemeral ? (
              <span
                aria-label={t('tree.ephemeralLabel')}
                className="tree-row__ephemeral-badge"
                title={t('tree.ephemeralTooltip')}
              >
                E
              </span>
            ) : null}
          </span>
          <span
            className={[
              'tree-row__open',
              isRootRow ? 'tree-row__open--root' : '',
              row.isEphemeral ? 'tree-row__open--ephemeral' : '',
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
  feedback: string | null
  onCancel: () => void
  onSubmit: (childName: string, initialData: string) => Promise<void>
}) {
  const { t } = useI18n()
  const { parentPath, feedback, onCancel, onSubmit } = props
  const [childName, setChildName] = useState('')
  const [initialData, setInitialData] = useState('')

  return (
    <AppDialog open ariaLabel="Create child node" onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(childName, initialData)
        }}
      >
        <h3>{t('tree.createChildNode')}</h3>
        <p>{t('tree.createChildDescription', { path: parentPath })}</p>

        <label className="dialog__field">
          <span>{t('tree.childName')}</span>
          <TextField
            size="small"
            slotProps={{ htmlInput: { 'aria-label': 'child node name' } }}
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
          />
        </label>

        <label className="dialog__field">
          <span>{t('tree.initialData')}</span>
          <TextField
            multiline
            minRows={5}
            slotProps={{ htmlInput: { 'aria-label': 'child node data' } }}
            value={initialData}
            onChange={(event) => setInitialData(event.target.value)}
          />
        </label>

        {feedback ? (
          <p className="dialog__error" role="status">
            {feedback}
          </p>
        ) : null}

        <div className="dialog__actions">
          <Button type="button" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" variant="contained">
            {t('tree.createChildNode')}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}

function DeleteNodeDialog(props: {
  row: TreeNodeRow
  error: string | null
  onCancel: () => void
  onDeleteNodeOnly: () => Promise<void>
  onDeleteSubtree: () => Promise<void>
}) {
  const { t } = useI18n()
  const { row, error, onCancel, onDeleteNodeOnly, onDeleteSubtree } = props

  return (
    <AppDialog open ariaLabel="Delete node confirmation" onClose={onCancel}>
      <div className="dialog__body">
        <h3>{t('tree.deleteNode')}</h3>
        <p>{t('tree.deleteNodeDescription', { path: row.path })}</p>
        {row.hasChildren ? (
          <p>{t('tree.deleteSubtreeDescription')}</p>
        ) : null}
        {error ? (
          <p className="dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog__actions">
          <Button type="button" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void onDeleteNodeOnly()}
          >
            {t('tree.deleteNodeOnly')}
          </Button>
          {row.hasChildren ? (
            <Button
              color="error"
              variant="contained"
              onClick={() => void onDeleteSubtree()}
            >
              {t('tree.deleteSubtree')}
            </Button>
          ) : null}
        </div>
      </div>
    </AppDialog>
  )
}

function formatRelativeSeconds(t: ReturnType<typeof useI18n>['t'], seconds: number): string {
  if (seconds < 10) {
    return t('tree.lastRefreshJustNow').replace(/^Last refresh: |^上次刷新：/, '')
  }
  if (seconds < 60) {
    return `${seconds} s ago`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} h${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(hours / 24)
  return `${days} d${days === 1 ? '' : 's'} ago`
}

function getLastRefreshLabel(
  t: ReturnType<typeof useI18n>['t'],
  lastRefreshedAt: number | null,
  now: number,
): string {
  if (lastRefreshedAt == null) {
    return t('tree.lastRefreshNever')
  }
  const seconds = Math.max(0, Math.floor((now - lastRefreshedAt) / 1000))
  if (seconds < 10) {
    return t('tree.lastRefreshJustNow')
  }
  return t('tree.lastRefreshAgo', {
    value: formatRelativeSeconds(t, seconds),
  })
}

export function TreePanel({
  containerRef,
}: {
  containerRef?: { current: HTMLElement | null }
}) {
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
    refreshingTree,
    lastRefreshedAt,
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
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastScrolledPathRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const lastRefreshLabel = getLastRefreshLabel(t, lastRefreshedAt, now)

  const rootLoaded = Object.prototype.hasOwnProperty.call(rowsByPath, '/')
  const rootRows = rowsByPath['/'] ?? []
  const rootRow: TreeNodeRow = {
    path: '/',
    name: '/',
    hasChildren: rootRows.length > 0,
    dataLength: null,
    mtime: null,
    isEphemeral: false,
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
      setDeleteError(null)
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
    if (!activePath) {
      lastScrolledPathRef.current = null
      return
    }

    // 只在 activePath 真正变化时滚动，避免展开/折叠或数据刷新引发的二次跳动。
    if (lastScrolledPathRef.current === activePath) {
      return
    }

    const activeRow = rowRefs.current[activePath]
    if (!activeRow || typeof activeRow.scrollIntoView !== 'function') {
      return
    }

    lastScrolledPathRef.current = activePath

    // 模仿 RedisInsight：仅在节点不可见时以最小距离滚动到边缘，
    // 已经在视口内的节点保持原位，不强制居中。
    activeRow.scrollIntoView({
      block: 'nearest',
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

    const result = await deleteNode(deleteDialog.row.path)
    if (result.ok) {
      setDeleteDialog(null)
      setDeleteError(null)
    } else {
      setDeleteError(result.error)
    }
  }

  async function handleDeleteSubtree() {
    if (!deleteDialog) {
      return
    }

    const result = await deleteNode(deleteDialog.row.path, { recursive: true })
    if (result.ok) {
      setDeleteDialog(null)
      setDeleteError(null)
    } else {
      setDeleteError(result.error)
    }
  }

  function handleQuickDelete(row: TreeNodeRow) {
    setHoveredPath(null)
    setContextMenu(null)
    setDeleteError(null)
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
    <aside ref={containerRef} className="panel tree-panel" aria-label={t('panel.nodes')}>
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('panel.tree')}</div>
          <h2 className="panel__title">{t('panel.nodes')}</h2>
        </div>
        <div className="panel__actions">
          <Button size="small" onClick={() => openNode('/')}>
            {t('tree.openRoot')}
          </Button>
          <Button size="small" onClick={() => void loadRoot()}>
            {t('tree.loadRoot')}
          </Button>
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
            <div
              className="tree-grid__header-cell"
              role="columnheader"
              aria-label={t('tree.columnNode')}
            >
              <span className="tree-grid__header-title" aria-hidden="true">
                {t('tree.columnNode')}
              </span>
              <div className="tree-grid__header-meta">
                <span
                  className="tree-grid__last-refresh"
                  aria-hidden="true"
                  title={
                    lastRefreshedAt == null
                      ? ''
                      : new Date(lastRefreshedAt).toLocaleString()
                  }
                >
                  {lastRefreshLabel}
                </span>
                <Tooltip disableInteractive title={t('tree.refreshTree')}>
                  <span className="tree-grid__refresh-anchor">
                    <button
                      type="button"
                      aria-label={t('tree.refreshTree')}
                      aria-busy={refreshingTree}
                      className={[
                        'tree-grid__refresh',
                        refreshingTree ? 'tree-grid__refresh--loading' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={refreshingTree}
                      onClick={() => void refreshTree()}
                    >
                      <RefreshIcon spinning={refreshingTree} />
                    </button>
                  </span>
                </Tooltip>
              </div>
            </div>
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

      <Menu
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
      >
        {contextMenu ? (
          <>
            <MenuItem
              onClick={() => {
                setContextMenu(null)
                setCreateDialog({ parentPath: contextMenu.row.path })
              }}
            >
              {t('tree.createChildNode')}
            </MenuItem>
            {contextMenu.row.path !== '/' ? (
              <MenuItem
                onClick={() => {
                  setContextMenu(null)
                  setDeleteError(null)
                  setDeleteDialog({ row: contextMenu.row })
                }}
              >
                {t('tree.deleteNode')}
              </MenuItem>
            ) : null}
            <div className="context-menu__mark-row">
              <span className="context-menu__label">{t('tree.markNode')}</span>
              <div
                className="context-menu__swatches"
                role="group"
                aria-label={t('tree.markNode')}
              >
                {markOptions.map((color) => {
                  const isSelected =
                    marksByPath[contextMenu.row.path] === color

                  return (
                    <MenuItem
                      key={color}
                      role="menuitemradio"
                      selected={isSelected}
                      aria-label={`${color} node mark`}
                      className={[
                        'context-menu__swatch',
                        `context-menu__swatch--${color}`,
                        isSelected ? 'context-menu__swatch--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setContextMenu(null)
                        if (isSelected) {
                          void clearNodeMark(
                            activeConnectionId,
                            contextMenu.row.path,
                          )
                          return
                        }

                        void setNodeMark(
                          activeConnectionId,
                          contextMenu.row.path,
                          color,
                        )
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </Menu>

      {createDialog ? (
        <CreateChildNodeDialog
          parentPath={createDialog.parentPath}
          feedback={feedback}
          onCancel={() => setCreateDialog(null)}
          onSubmit={handleCreateSubmit}
        />
      ) : null}

      {deleteDialog ? (
        <DeleteNodeDialog
          row={deleteDialog.row}
          error={deleteError}
          onCancel={() => {
            setDeleteDialog(null)
            setDeleteError(null)
          }}
          onDeleteNodeOnly={handleDeleteNodeOnly}
          onDeleteSubtree={handleDeleteSubtree}
        />
      ) : null}
    </aside>
  )
}
