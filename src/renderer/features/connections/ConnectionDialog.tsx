import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { useI18n } from '../../use-i18n'
import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionDialog() {
  const {
    dialogOpen,
    dialogError,
    submitting,
    closeDialog,
    saveConnection,
  } = useConnectionsStore()
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [hosts, setHosts] = useState('')
  const [chroot, setChroot] = useState('')

  useEffect(() => {
    if (!dialogOpen) {
      setName('')
      setHosts('')
      setChroot('')
    }
  }, [dialogOpen])

  if (!dialogOpen) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await saveConnection({
      name,
      hosts,
      chroot,
    })
  }

  return (
    <div className="dialog-backdrop">
      <form
        aria-label={t('dialog.createConnection')}
        aria-modal="true"
        className="dialog"
        role="dialog"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h3>{t('dialog.createConnection')}</h3>
        <p>{t('dialog.createDescription')}</p>

        <label className="dialog__field">
          <span>{t('dialog.connectionName')}</span>
          <input
            aria-label="connection name"
            name="name"
            placeholder={t('dialog.connectionNamePlaceholder')}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="dialog__field">
          <span>{t('dialog.hosts')}</span>
          <input
            aria-label="connection hosts"
            name="hosts"
            placeholder={t('dialog.hostsPlaceholder')}
            type="text"
            value={hosts}
            onChange={(event) => setHosts(event.target.value)}
          />
        </label>
        <label className="dialog__field">
          <span>{t('dialog.chroot')}</span>
          <input
            aria-label="connection chroot"
            name="chroot"
            placeholder={t('dialog.chrootPlaceholder')}
            type="text"
            value={chroot}
            onChange={(event) => setChroot(event.target.value)}
          />
        </label>

        {dialogError ? <div role="alert">{dialogError}</div> : null}

        <div className="dialog__actions">
          <button type="button" onClick={closeDialog}>
            {t('dialog.cancel')}
          </button>
          <button
            aria-label="save connection"
            className="button-primary"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t('dialog.saving') : t('dialog.saveConnection')}
          </button>
        </div>
      </form>
    </div>
  )
}
