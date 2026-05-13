type NodeEditorProps = {
  path: string
  value: string
  error: string | null
  isLoading: boolean
  isSaving: boolean
  onChange: (value: string) => void
  onFormatJson: () => void
  onFormatXml: () => void
  onSave: () => void
}

export function NodeEditor({
  path,
  value,
  error,
  isLoading,
  isSaving,
  onChange,
  onFormatJson,
  onFormatXml,
  onSave,
}: NodeEditorProps) {
  return (
    <section className="workspace-card" aria-label="Node data pane">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Data</div>
          <h2 className="panel__title">{path}</h2>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" onClick={onFormatJson}>
            Format JSON
          </button>
          <button type="button" onClick={onFormatXml}>
            Format XML
          </button>
          <button type="button" onClick={onSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="panel__body">
        <label htmlFor="node-data-editor">Node data editor</label>
        <textarea
          id="node-data-editor"
          aria-label="Node data editor"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          style={{
            minHeight: '280px',
            resize: 'vertical',
            width: '100%',
          }}
        />
        {isLoading ? <p>Loading node data...</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </section>
  )
}
