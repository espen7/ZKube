type TreeSearchBarProps = {
  query: string
  onQueryChange: (query: string) => void
  onDeepSearch: () => void
}

export function TreeSearchBar({
  query,
  onQueryChange,
  onDeepSearch,
}: TreeSearchBarProps) {
  return (
    <div className="dialog__field">
      <label htmlFor="tree-search-input">筛选节点</label>
      <div className="panel__actions">
        <input
          id="tree-search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="按路径过滤已加载节点"
          type="text"
        />
        <button type="button" onClick={onDeepSearch}>
          深度搜索
        </button>
      </div>
    </div>
  )
}
