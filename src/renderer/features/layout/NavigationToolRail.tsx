import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useConnectionsStore } from '../connections/useConnectionsStore'
import { useI18n } from '../../use-i18n'

const PROJECT_URL = 'https://github.com/espen7/ZKube'

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

function AboutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10v5" />
      <path d="M12 7.5h.01" />
    </svg>
  )
}

function BrandGlyph() {
  return (
    <svg viewBox="0 0 512 512" fill="none">
      <path
        d="M64 152c0-48.601 39.399-88 88-88h208c48.601 0 88 39.399 88 88v208c0 48.601-39.399 88-88 88H152c-48.601 0-88-39.399-88-88V152Z"
        fill="url(#zkubeAboutBackground)"
      />
      <path
        d="M65.5 152c0-47.773 38.727-86.5 86.5-86.5h208c47.773 0 86.5 38.727 86.5 86.5v208c0 47.773-38.727 86.5-86.5 86.5H152c-47.773 0-86.5-38.727-86.5-86.5V152Z"
        stroke="#24C8A5"
        strokeOpacity="0.16"
        strokeWidth="3"
      />
      <path
        d="M158 148H356C371.464 148 384 160.536 384 176C384 191.464 371.464 204 356 204H258.839L362.008 307.169C372.942 318.103 372.942 335.831 362.008 346.765C351.074 357.699 333.346 357.699 322.412 346.765L159.402 183.755C151.392 175.745 149.015 163.698 153.379 153.252C157.742 142.807 167.935 136 179.255 136H356"
        fill="url(#zkubeAboutAccent)"
      />
      <path
        d="M354 364H156C140.536 364 128 351.464 128 336C128 320.536 140.536 308 156 308H253.161L149.992 204.831C139.058 193.897 139.058 176.169 149.992 165.235C160.926 154.301 178.654 154.301 189.588 165.235L352.598 328.245C360.608 336.255 362.985 348.302 358.621 358.748C354.258 369.193 344.065 376 332.745 376H156"
        fill="#F8FAFC"
      />
      <defs>
        <linearGradient
          id="zkubeAboutBackground"
          x1="96"
          y1="64"
          x2="416"
          y2="448"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#16233A" />
          <stop offset="1" stopColor="#0B1325" />
        </linearGradient>
        <linearGradient
          id="zkubeAboutAccent"
          x1="156"
          y1="140"
          x2="356"
          y2="356"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5EEAD4" />
          <stop offset="1" stopColor="#24C8A5" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function AboutDialog({
  open,
  version,
  copied,
  onClose,
  onCopy,
}: {
  open: boolean
  version: string
  copied: boolean
  onClose: () => void
  onCopy: () => void
}) {
  const { t } = useI18n()

  if (!open) {
    return null
  }

  return createPortal(
    <div className="dialog-backdrop dialog-backdrop--overlay">
      <div
        aria-label={t('about.title')}
        aria-modal="true"
        className="dialog about-dialog"
        role="dialog"
      >
        <div className="about-dialog__header">
          <div className="about-dialog__icon" aria-hidden="true">
            <BrandGlyph />
          </div>
          <div className="about-dialog__identity">
            <h3>ZKube</h3>
            <p>{t('about.subtitle')}</p>
          </div>
        </div>

        <dl className="about-dialog__details">
          <dt>{t('about.version')}</dt>
          <dd>{version}</dd>
          <dt>{t('about.copyright')}</dt>
          <dd>{t('about.copyrightValue')}</dd>
          <dt>{t('about.project')}</dt>
          <dd>
            <div className="about-dialog__link-row">
              <input readOnly value={PROJECT_URL} aria-label={t('about.project')} />
              <button type="button" onClick={onCopy}>
                {copied ? t('about.copied') : t('about.copyLink')}
              </button>
            </div>
          </dd>
        </dl>

        <div className="dialog__actions">
          <button type="button" onClick={onClose}>
            {t('about.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function NavigationToolRail() {
  const { openCreateDialog, importFromFile, exportToFile } = useConnectionsStore()
  const { t } = useI18n()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [version, setVersion] = useState('--')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!aboutOpen) {
      setCopied(false)
      return
    }

    let cancelled = false

    void window.zkube?.app
      .getVersion()
      .then((result) => {
        if (!cancelled) {
          setVersion(result.version)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersion('--')
        }
      })

    return () => {
      cancelled = true
    }
  }, [aboutOpen])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(PROJECT_URL)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <aside aria-label="Navigation tools" className="tool-rail">
        <div className="tool-rail__group">
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
        </div>

        <div className="tool-rail__group tool-rail__group--bottom">
          <RailButton
            label={t('tool.about')}
            onClick={() => {
              setAboutOpen(true)
            }}
          >
            <AboutIcon />
          </RailButton>
        </div>
      </aside>

      <AboutDialog
        open={aboutOpen}
        version={version}
        copied={copied}
        onClose={() => setAboutOpen(false)}
        onCopy={() => {
          void handleCopyLink()
        }}
      />
    </>
  )
}
