import { Button, TextField } from '@mui/material'

import { AppDialog } from '../../components/AppDialog'
import { useI18n } from '../../use-i18n'

const PROJECT_URL = 'https://github.com/espen7/ZKube'

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

export function AboutDialog({
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

  return (
    <AppDialog
      open={open}
      ariaLabel={t('about.title')}
      onClose={onClose}
      paperClassName="about-dialog"
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
            <TextField
              slotProps={{
                htmlInput: {
                  'aria-label': t('about.project'),
                  readOnly: true,
                },
              }}
              size="small"
              value={PROJECT_URL}
              onChange={() => undefined}
            />
            <Button type="button" onClick={onCopy}>
              {copied ? t('about.copied') : t('about.copyLink')}
            </Button>
          </div>
        </dd>
      </dl>

      <div className="dialog__actions">
        <Button type="button" onClick={onClose}>
          {t('about.close')}
        </Button>
      </div>
    </AppDialog>
  )
}

export { PROJECT_URL }
