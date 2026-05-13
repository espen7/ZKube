import { useEffect } from 'react'

import { TreeSearchBar } from './TreeSearchBar'
import { useTreeStore } from './useTreeStore'

type TreeBranchProps = {
  path: string
  depth: number
  expandedPaths: string[]
  childrenByPath: Record<string, string[]>
  query: string
  onToggle: (path: string) => void
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
}: TreeBranchProps) {
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
          {isExpanded ? '收起' : '展开'}
        </button>
        <span>{path}</span>
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
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function TreePanel() {
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
    <aside className="panel" aria-label="节点树面板">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Tree</div>
          <h2 className="panel__title">节点树</h2>
        </div>
        <div className="panel__actions">
          <button type="button" onClick={() => void loadRoot()}>
            加载根节点
          </button>
          <button type="button" onClick={() => void createDemoNode()}>
            演示创建
          </button>
          <button type="button" onClick={() => void deleteDemoNode()}>
            演示删除
          </button>
        </div>
      </div>
      <div className="panel__body">
        <TreeSearchBar
          query={query}
          onQueryChange={setQuery}
          onDeepSearch={() => void runDeepSearch()}
        />

        {feedback ? (
          <div className="sidebar-feedback" role="status">
            {feedback}
          </div>
        ) : null}

        {loadingPaths.includes('/') ? (
          <div className="muted">正在加载根节点...</div>
        ) : null}

        {rootChildren.length === 0 ? (
          <div className="placeholder-row">先加载根节点，再展开需要的目录。</div>
        ) : (
          <ul
            aria-label="已加载节点"
            className="sidebar-list"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {rootVisible.length === 0 ? (
              <li className="placeholder-row">当前筛选条件下没有已加载节点。</li>
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
                />
              ))
            )}
          </ul>
        )}

        {searchResults.length > 0 ? (
          <div>
            <div className="muted">深度搜索结果</div>
            <ul
              aria-label="深度搜索结果"
              className="sidebar-list"
              style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}
            >
              {searchResults.map((path) => (
                <li key={path} className="placeholder-row">
                  {path}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
