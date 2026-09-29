import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { Alert, Button, TextField } from '@mui/material'

import { AppDialog } from '../../components/AppDialog'
import { useI18n } from '../../use-i18n'
import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionDialog() {
  const {
    dialogOpen,
    editingConnection,
    dialogError,
    submitting,
    closeDialog,
    saveConnection,
  } = useConnectionsStore()
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [hosts, setHosts] = useState('')
  const [chroot, setChroot] = useState('')
  const isEditing = editingConnection !== null

  useEffect(() => {
    if (!dialogOpen) {
      setName('')
      setHosts('')
      setChroot('')
      return
    }

    setName(editingConnection?.name ?? '')
    setHosts(editingConnection?.hosts ?? '')
    setChroot(editingConnection?.chroot ?? '')
  }, [dialogOpen, editingConnection])

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
    <AppDialog
      open
      ariaLabel={t(
        isEditing ? 'dialog.editConnection' : 'dialog.createConnection',
      )}
      onClose={closeDialog}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h3>
          {t(isEditing ? 'dialog.editConnection' : 'dialog.createConnection')}
        </h3>
        <p>
          {t(
            isEditing
              ? 'dialog.editDescription'
              : 'dialog.createDescription',
          )}
        </p>

        <label className="dialog__field">
          <span>{t('dialog.connectionName')}</span>
          <TextField
            placeholder={t('dialog.connectionNamePlaceholder')}
            size="small"
            slotProps={{ htmlInput: { 'aria-label': 'connection name' } }}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="dialog__field">
          <span>{t('dialog.hosts')}</span>
          <TextField
            placeholder={t('dialog.hostsPlaceholder')}
            size="small"
            slotProps={{ htmlInput: { 'aria-label': 'connection hosts' } }}
            type="text"
            value={hosts}
            onChange={(event) => setHosts(event.target.value)}
          />
        </label>
        <label className="dialog__field">
          <span>{t('dialog.chroot')}</span>
          <TextField
            placeholder={t('dialog.chrootPlaceholder')}
            size="small"
            slotProps={{ htmlInput: { 'aria-label': 'connection chroot' } }}
            type="text"
            value={chroot}
            onChange={(event) => setChroot(event.target.value)}
          />
        </label>

        {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}

        <div className="dialog__actions">
          <Button type="button" onClick={closeDialog}>
            {t('dialog.cancel')}
          </Button>
          <Button
            aria-label="save connection"
            disabled={submitting}
            type="submit"
            variant="contained"
          >
            {submitting
              ? t('dialog.saving')
              : t(
                  isEditing
                    ? 'dialog.saveEditedConnection'
                    : 'dialog.saveConnection',
                )}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
