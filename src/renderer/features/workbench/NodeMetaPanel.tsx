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
  return (
    <section className="workspace-card" aria-label="Node meta pane">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Meta</div>
          <h2 className="panel__title">{path}</h2>
        </div>
      </div>
      <div className="panel__body">
        <dl
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'max-content 1fr',
            margin: 0,
          }}
        >
          <dt>Version</dt>
          <dd>{version}</dd>
          <dt>Children</dt>
          <dd>{numChildren}</dd>
        </dl>
      </div>
    </section>
  )
}
