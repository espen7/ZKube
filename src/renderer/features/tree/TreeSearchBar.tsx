import { Button, TextField } from '@mui/material'

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
        <TextField
          id="tree-search-input"
          size="small"
          value={query}
          placeholder={t('tree.filterPlaceholder')}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <Button size="small" onClick={onDeepSearch}>
          {t('tree.deepSearch')}
        </Button>
      </div>
    </div>
  )
}
