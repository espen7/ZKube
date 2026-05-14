import { useI18n } from '../../use-i18n'
import { formatBytes } from '../tree/tree-formatters'

type NodeInspectorProps = {
  path: string | null
  stat:
    | {
        version: number
        numChildren: number
        mtime: number | null
        dataLength: number | null
      }
    | null
}

function formatAbsoluteTime(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  return new Date(value).toLocaleString()
}

export function NodeInspector({ path, stat }: NodeInspectorProps) {
  const { t } = useI18n()

  return (
    <aside className="panel inspector" aria-label="Node inspector">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('panel.inspector')}</div>
          <h2 className="panel__title">{t('panel.nodeInspector')}</h2>
        </div>
      </div>
      <div aria-label="Inspector content" className="panel__body panel__body--scroll">
        {!path || !stat ? (
          <div className="placeholder-row">{t('inspector.empty')}</div>
        ) : (
          <section aria-label="Node inspector summary" className="inspector-summary">
            <div className="inspector-summary__path">
              <div className="panel__eyebrow">{t('inspector.path')}</div>
              <div className="inspector-summary__path-value">{path}</div>
            </div>

            <dl className="inspector-summary__grid">
              <dt>{t('inspector.version')}</dt>
              <dd>{stat.version}</dd>

              <dt>{t('inspector.children')}</dt>
              <dd>{stat.numChildren}</dd>

              <dt>{t('inspector.dataSize')}</dt>
              <dd>{formatBytes(stat.dataLength)}</dd>

              <dt>{t('inspector.mtime')}</dt>
              <dd>{formatAbsoluteTime(stat.mtime)}</dd>
            </dl>
          </section>
        )}
      </div>
    </aside>
  )
}
