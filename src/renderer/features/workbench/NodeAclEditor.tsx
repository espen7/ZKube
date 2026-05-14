import { useEffect, useMemo, useState } from 'react'

import type { AclEntry } from '../../../shared/models/node'
import { useI18n } from '../../use-i18n'

const permissionKeys = ['read', 'write', 'create', 'delete', 'admin'] as const

type PermissionKey = (typeof permissionKeys)[number]

type NodeAclEditorProps = {
  path: string
  acl: AclEntry[]
  onSaved?: (acl: AclEntry[]) => void
}

function getWorldAnyoneEntry(acl: AclEntry[]) {
  return acl.find((entry) => entry.scheme === 'world' && entry.id === 'anyone')
}

function normalizePermissions(permissions: AclEntry['permissions']): PermissionKey[] {
  const selected = new Set(permissions)
  return permissionKeys.filter((permission) => selected.has(permission))
}

function buildNextAcl(acl: AclEntry[], permissions: PermissionKey[]) {
  const nextEntry: AclEntry = {
    scheme: 'world',
    id: 'anyone',
    permissions,
  }
  const remainingEntries = acl.filter(
    (entry) => !(entry.scheme === 'world' && entry.id === 'anyone'),
  )

  return [nextEntry, ...remainingEntries]
}

export function NodeAclEditor({ path, acl, onSaved }: NodeAclEditorProps) {
  const { t } = useI18n()
  const worldAnyoneEntry = useMemo(() => getWorldAnyoneEntry(acl), [acl])
  const canEditWorldAnyone = Boolean(worldAnyoneEntry)
  const initialPermissions = useMemo(
    () => normalizePermissions(worldAnyoneEntry?.permissions ?? []),
    [worldAnyoneEntry],
  )
  const permissionSignature = initialPermissions.join('|')
  const [selectedPermissions, setSelectedPermissions] =
    useState<PermissionKey[]>(initialPermissions)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedPermissions(initialPermissions)
    setError(null)
  }, [path, permissionSignature])

  async function handleSave() {
    if (!window.zkube?.zookeeper.saveAcl || !canEditWorldAnyone) {
      return
    }

    const nextAcl = buildNextAcl(acl, selectedPermissions)

    setSaving(true)
    setFeedback(null)
    setError(null)

    try {
      await window.zkube.zookeeper.saveAcl(path, nextAcl)
      onSaved?.(nextAcl)
      setFeedback(t('acl.saved', { path }))
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : t('acl.saveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="workspace-card" aria-label="Node acl pane">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">{t('acl.title')}</div>
          <h2 className="panel__title">{path}</h2>
        </div>
      </div>
      <div className="panel__body panel__body--scroll">
        <div className="placeholder-row">
          {canEditWorldAnyone
            ? t('acl.editingWorldAnyone')
            : t('acl.noWorldAnyone')}
        </div>
        <div
          style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          }}
        >
          {permissionKeys.map((permission) => (
            <label
              key={permission}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="checkbox"
                checked={selectedPermissions.includes(permission)}
                disabled={!canEditWorldAnyone}
                onChange={(event) => {
                  setSelectedPermissions((current) => {
                    const nextPermissions = event.target.checked
                      ? [...current, permission]
                      : current.filter((entry) => entry !== permission)

                    return normalizePermissions(nextPermissions)
                  })
                  setFeedback(null)
                  setError(null)
                }}
              />
              <span>{permission}</span>
            </label>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canEditWorldAnyone}
          >
            {saving ? t('acl.saving') : t('acl.save')}
          </button>
          {feedback ? <p role="status">{feedback}</p> : null}
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </section>
  )
}
