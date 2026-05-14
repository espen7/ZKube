import type { ReactNode } from 'react'

import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useI18n } from '../../use-i18n'

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      className="tool-rail__button"
      title={label}
      type="button"
      onClick={onClick}
    >
      <span aria-hidden="true" className="tool-rail__icon">
        {children}
      </span>
    </button>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 0 0 0-7.2Z" />
      <path d="M4.8 13.5l-1.3-1.5l1.3-1.5l1.9-.2a5.9 5.9 0 0 1 .7-1.6L6.3 7l.9-1.8l1.9.3c.5-.4 1-.6 1.6-.7L12 3.1l1.3 1.7c.6.1 1.1.3 1.6.7l1.9-.3l.9 1.8l-1.1 1.7c.3.5.5 1 .7 1.6l1.9.2l1.3 1.5l-1.3 1.5l-1.9.2a5.9 5.9 0 0 1-.7 1.6l1.1 1.7l-.9 1.8l-1.9-.3c-.5.4-1 .6-1.6.7L12 20.9l-1.3-1.7a5.5 5.5 0 0 1-1.6-.7l-1.9.3l-.9-1.8l1.1-1.7a5.9 5.9 0 0 1-.7-1.6l-1.9-.2Z" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
      <path d="M6.5 20h11" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20V10" />
      <path d="m8.5 13.5 3.5-3.5 3.5 3.5" />
      <path d="M5 5.5h14" />
      <path d="M6.5 4h11" />
    </svg>
  )
}

export function NavigationToolRail() {
  const { openCreateDialog, importFromFile, exportToFile } = useConnectionsStore()
  const { t } = useI18n()

  return (
    <aside aria-label="Navigation tools" className="tool-rail">
      <RailButton label={t('tool.createConnection')} onClick={openCreateDialog}>
        <AddIcon />
      </RailButton>
      <RailButton
        label={t('tool.openSettings')}
        onClick={() => {
          void window.zkube?.preferences?.openSettingsWindow()
        }}
      >
        <SettingsIcon />
      </RailButton>
      <RailButton
        label={t('tool.importConnections')}
        onClick={() => {
          void importFromFile()
        }}
      >
        <ImportIcon />
      </RailButton>
      <RailButton
        label={t('tool.exportConnections')}
        onClick={() => {
          void exportToFile()
        }}
      >
        <ExportIcon />
      </RailButton>
    </aside>
  )
}
