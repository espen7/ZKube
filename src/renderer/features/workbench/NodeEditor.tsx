import Editor from '@monaco-editor/react'

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

function getLanguage(value: string) {
  return value.trim().startsWith('<') ? 'xml' : 'json'
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
          <button type="button" onClick={onFormatJson} disabled={isLoading}>
            Format JSON
          </button>
          <button type="button" onClick={onFormatXml} disabled={isLoading}>
            Format XML
          </button>
          <button type="button" onClick={onSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="panel__body">
        <div>Node data editor</div>
        <Editor
          height="320px"
          language={getLanguage(value)}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: isLoading,
            scrollBeyondLastLine: false,
          }}
          theme="vs-dark"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
        />
        {isLoading ? <p>Loading node data...</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </section>
  )
}
