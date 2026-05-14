import { useEffect } from 'react'

import { useI18n } from '../../use-i18n'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { TreeSearchBar } from './TreeSearchBar'
import { useTreeStore } from './useTreeStore'

type TreeBranchProps = {
  path: string
  depth: number
  expandedPaths: string[]
  childrenByPath: Record<string, string[]>
  query: string
  onToggle: (path: string) => void
  onOpen: (path: string) => void
}

function shouldRenderPath(
  path: string,
  query: string,
  childrenByPath: Record<string, string[]>,
): boolean {
  if (!query) {
    return true
  }

  if (path.toLowerCase().includes(query.toLowerCase())) {
    return true
  }

  const children = childrenByPath[path] ?? []
  return children.some((child) => shouldRenderPath(child, query, childrenByPath))
}

function TreeBranch({
  path,
  depth,
  expandedPaths,
  childrenByPath,
  query,
  onToggle,
  onOpen,
}: TreeBranchProps) {
  const { t } = useI18n()

  if (!shouldRenderPath(path, query, childrenByPath)) {
    return null
  }

  const children = childrenByPath[path] ?? []
  const isExpanded = expandedPaths.includes(path)

  return (
    <li>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: `${depth * 16}px`,
        }}
      >
        <button type="button" onClick={() => void onToggle(path)}>
          {isExpanded ? t('tree.collapse') : t('tree.expand')}
        </button>
        <button type="button" onClick={() => onOpen(path)}>
          {path}
        </button>
      </div>
      {isExpanded && children.length > 0 ? (
        <ul style={{ display: 'grid', gap: '8px', margin: '8px 0 0', padding: 0 }}>
          {children.map((child) => (
            <TreeBranch
              key={child}
              path={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              childrenByPath={childrenByPath}
              query={query}
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
  const openNode = useWorkbenchStore((store) => store.openNode)
  const {
    childrenByPath,
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

  const rootChildren = childrenByPath['/'] ?? []
  const rootVisible = !query
    ? rootChildren
    : rootChildren.filter((path) => shouldRenderPath(path, query, childrenByPath))

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

          {loadingPaths.includes('/') ? (
            <div className="muted">{t('tree.loadingRoot')}</div>
          ) : null}

          {rootChildren.length === 0 ? (
            <div className="placeholder-row">{t('tree.loadRootHint')}</div>
          ) : (
            <ul
              aria-label="Loaded tree nodes"
              className="sidebar-list"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {rootVisible.length === 0 ? (
                <li className="placeholder-row">{t('tree.noLoadedNodes')}</li>
              ) : (
                rootVisible.map((path) => (
                  <TreeBranch
                    key={path}
                    path={path}
                    depth={0}
                    expandedPaths={expandedPaths}
                    childrenByPath={childrenByPath}
                    query={query}
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
              <ul
                aria-label="Deep search results"
                className="sidebar-list"
                style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}
              >
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
