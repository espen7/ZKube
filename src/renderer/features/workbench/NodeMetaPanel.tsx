import { useI18n } from '../../use-i18n'

type NodeMetaPanelProps = {
  path: string
  version: number
  numChildren: number
}

export function NodeMetaPanel({
  path,
  version,
  numChildren,
}: NodeMetaPanelProps) {
  const { t } = useI18n()

  return (
    <section className="workspace-card" aria-label="Node meta pane">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('meta.title')}</div>
          <h2 className="panel__title">{path}</h2>
        </div>
      </div>
      <div className="panel__body panel__body--scroll">
        <dl
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'max-content 1fr',
            margin: 0,
          }}
        >
          <dt>{t('meta.version')}</dt>
          <dd>{version}</dd>
          <dt>{t('meta.children')}</dt>
          <dd>{numChildren}</dd>
        </dl>
      </div>
    </section>
  )
}
