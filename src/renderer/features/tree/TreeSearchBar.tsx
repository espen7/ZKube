import { useI18n } from '../../use-i18n'

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
  const { t } = useI18n()

  return (
    <div className="dialog__field">
      <label htmlFor="tree-search-input">{t('tree.filterLabel')}</label>
      <div className="panel__actions">
        <input
          id="tree-search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('tree.filterPlaceholder')}
          type="text"
        />
        <button type="button" onClick={onDeepSearch}>
          {t('tree.deepSearch')}
        </button>
      </div>
    </div>
  )
}
