import { useEffect } from 'react'

import type { TreeNodeRow } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { TreeSearchBar } from './TreeSearchBar'
import { formatBytes, formatRelativeTime } from './tree-formatters'
import { useTreeStore } from './useTreeStore'

type TreeBranchProps = {
  row: TreeNodeRow
  depth: number
  expandedPaths: string[]
  rowsByPath: Record<string, TreeNodeRow[]>
  query: string
  activePath: string | null
  onToggle: (path: string) => void
  onOpen: (path: string) => void
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
  query,
  activePath,
  onToggle,
  onOpen,
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

  return (
    <li className="tree-row-wrapper">
      <div
        aria-label={`Open node ${row.path}`}
        className={rowClassName}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row.path)}
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
              ·
            </span>
          )}
          <span aria-hidden="true" className="tree-row__icon">
            {row.hasChildren ? <FolderIcon /> : <FileIcon />}
          </span>
          <span className="tree-row__open" title={row.path}>
            {row.name}
          </span>
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
              query={query}
              activePath={activePath}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function TreePanel() {
  const { t } = useI18n()
  const activePath = useWorkbenchStore((store) => store.activePath)
  const openNode = useWorkbenchStore((store) => store.openNode)
  const {
    rowsByPath,
    expandedPaths,
    loadingPaths,
    query,
    searchResults,
    feedback,
    loadRoot,
    toggleNode,
    setQuery,
    runDeepSearch,
    createDemoNode,
    deleteDemoNode,
    handleRuntimeEvent,
  } = useTreeStore()

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
          <button type="button" onClick={() => void createDemoNode()}>
            {t('tree.demoCreate')}
          </button>
          <button type="button" onClick={() => void deleteDemoNode()}>
            {t('tree.demoDelete')}
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
                    query={query}
                    activePath={activePath}
                    onToggle={toggleNode}
                    onOpen={openNode}
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
    </aside>
  )
}
