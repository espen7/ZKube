import { useI18n } from '../../use-i18n'
import { formatBytes } from '../tree/tree-formatters'

type NodeMetaPanelProps = {
  path: string
  version: number
  numChildren: number
  dataLength: number | null
  mtime: number | null
}

function formatAbsoluteTime(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  return new Date(value).toLocaleString()
}

export function NodeMetaPanel({
  path,
  version,
  numChildren,
  dataLength,
  mtime,
}: NodeMetaPanelProps) {
  const { t } = useI18n()

  return (
    <section className="workspace-card" aria-label="Node meta pane">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('meta.title')}</div>
          <h2 className="panel__title">{t('meta.title')}</h2>
        </div>
      </div>
      <div className="panel__body panel__body--scroll">
        <section aria-label="Node meta summary" className="inspector-summary">
          <div className="inspector-summary__path">
            <div className="panel__eyebrow">{t('inspector.path')}</div>
            <div className="inspector-summary__path-value">{path}</div>
          </div>

          <dl className="inspector-summary__grid">
            <dt>{t('meta.version')}</dt>
            <dd>{version}</dd>

            <dt>{t('meta.children')}</dt>
            <dd>{numChildren}</dd>

            <dt>{t('inspector.dataSize')}</dt>
            <dd>{formatBytes(dataLength)}</dd>

            <dt>{t('inspector.mtime')}</dt>
            <dd>{formatAbsoluteTime(mtime)}</dd>
          </dl>
        </section>
      </div>
    </section>
  )
}
