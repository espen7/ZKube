import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { LucideIcon } from '../../components/LucideIcon'
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
    <LucideIcon name="square-plus">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </LucideIcon>
  )
}

function SettingsIcon() {
  return (
    <LucideIcon name="settings-2">
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </LucideIcon>
  )
}

function ImportIcon() {
  return (
    <LucideIcon name="import">
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M20 21H4" />
    </LucideIcon>
  )
}

function ExportIcon() {
  return (
    <LucideIcon name="export">
      <path d="M12 21V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M20 3H4" />
    </LucideIcon>
  )
}

function AboutIcon() {
  return (
    <LucideIcon name="info">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </LucideIcon>
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
            label={t('tool.openSettings')}
            onClick={() => {
              void window.zkube?.preferences?.openSettingsWindow()
            }}
          >
            <SettingsIcon />
          </RailButton>
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
