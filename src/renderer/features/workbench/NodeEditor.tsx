import { useEffect, useState } from 'react'

import Editor, { type Monaco } from '@monaco-editor/react'

import { useI18n } from '../../use-i18n'
import { useThemeStore } from '../settings/useThemeStore'

type NodeEditorProps = {
  path: string
  value: string
  error: string | null
  errorCode: string | null
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

let monokaiRegistered = false

function ensureEditorThemes(monaco: Monaco) {
  if (monokaiRegistered) {
    return
  }

  monaco.editor.defineTheme('zkube-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'F8F8F2', background: '272822' },
      { token: 'comment', foreground: '75715E' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'keyword', foreground: 'F92672' },
      { token: 'delimiter', foreground: 'F8F8F2' },
      { token: 'operator', foreground: 'F92672' },
      { token: 'type', foreground: '66D9EF' },
      { token: 'tag', foreground: 'F92672' },
      { token: 'attribute.name', foreground: 'A6E22E' },
      { token: 'attribute.value', foreground: 'E6DB74' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#6E7066',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editorCursor.foreground': '#F8F8F0',
      'editor.selectionBackground': '#49483E',
      'editor.inactiveSelectionBackground': '#3E3D32',
      'editor.lineHighlightBackground': '#3A3B35',
      'editorIndentGuide.background1': '#3B3A32',
      'editorIndentGuide.activeBackground1': '#75715E',
      'editorWhitespace.foreground': '#49483E',
    },
  })

  monokaiRegistered = true
}

export function NodeEditor({
  path,
  value,
  error,
  errorCode,
  isLoading,
  isSaving,
  onChange,
  onFormatJson,
  onFormatXml,
  onSave,
}: NodeEditorProps) {
  const { theme, fontSizePx } = useThemeStore()
  const { t } = useI18n()
  const [monacoReady, setMonacoReady] = useState(import.meta.env.MODE === 'test')
  const [monacoError, setMonacoError] = useState<string | null>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return
    }

    let cancelled = false

    void import('./configure-monaco')
      .then(({ configureMonaco }) => configureMonaco())
      .then(() => {
        if (cancelled) {
          return
        }

        setMonacoReady(true)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setMonacoError(
          error instanceof Error
            ? error.message
            : 'Failed to initialize the editor runtime.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  const showLoading = isLoading || !monacoReady

  return (
    <section className="workspace-card workspace-card--editor" aria-label="Node data pane">
      <div className="panel__header">
        <div className="node-editor__heading">
          <div className="panel__eyebrow">{t('editor.data')}</div>
          <h2 className="panel__title node-editor__path">{path}</h2>
        </div>
      </div>
      <div className="panel__body node-editor__body" data-testid="node-editor-body">
        <div className="node-editor__label">{t('editor.placeholder')}</div>
        <div className="node-editor__surface">
          {monacoReady ? (
            <Editor
              beforeMount={ensureEditorThemes}
              height="100%"
              language={getLanguage(value)}
              options={{
                automaticLayout: true,
                fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
                fontSize: fontSizePx,
                minimap: { enabled: false },
                readOnly: showLoading,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
              theme={theme === 'light' ? 'vs' : 'zkube-monokai'}
              value={value}
              onChange={(nextValue) => onChange(nextValue ?? '')}
            />
          ) : (
            <div className="placeholder-row">{t('editor.loading')}</div>
          )}
        </div>
        <div className="node-editor__actions" data-testid="node-editor-actions">
          <button type="button" onClick={onFormatJson} disabled={showLoading}>
            {t('editor.formatJson')}
          </button>
          <button type="button" onClick={onFormatXml} disabled={showLoading}>
            {t('editor.formatXml')}
          </button>
          <button type="button" onClick={onSave} disabled={showLoading || isSaving}>
            {isSaving ? t('editor.saving') : t('editor.save')}
          </button>
        </div>
        {showLoading ? <p>{t('editor.loading')}</p> : null}
        {monacoError ? (
          <p className="node-editor__alert" role="alert">
            {monacoError}
          </p>
        ) : null}
        {error ? (
          <p
            className={
              errorCode === 'BAD_VERSION'
                ? 'node-editor__alert node-editor__alert--conflict'
                : 'node-editor__alert'
            }
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}
