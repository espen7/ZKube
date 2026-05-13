import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionDialog() {
  const {
    dialogOpen,
    dialogMode,
    dialogError,
    submitting,
    closeDialog,
    saveConnection,
    importConnections,
  } = useConnectionsStore()

  const [name, setName] = useState('')
  const [hosts, setHosts] = useState('')
  const [chroot, setChroot] = useState('')
  const [json, setJson] = useState('')

  useEffect(() => {
    if (!dialogOpen) {
      setName('')
      setHosts('')
      setChroot('')
      setJson('')
    }
  }, [dialogOpen, dialogMode])

  if (!dialogOpen || !dialogMode) {
    return null
  }

  const isImportMode = dialogMode === 'import'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isImportMode) {
      await importConnections(json)
      return
    }

    await saveConnection({
      name,
      hosts,
      chroot,
    })
  }

  return (
    <div className="dialog-backdrop">
      <form
        aria-label={isImportMode ? '导入连接 JSON' : '新建连接'}
        aria-modal="true"
        className="dialog"
        role="dialog"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h3>{isImportMode ? '导入连接 JSON' : '新建连接'}</h3>
        <p>
          {isImportMode
            ? '粘贴连接 JSON，导入后会立即刷新当前列表。'
            : '填写连接名称和地址后即可保存到本地连接列表。'}
        </p>

        {isImportMode ? (
          <label className="dialog__field">
            <span>连接 JSON</span>
            <textarea
              aria-label="connection json"
              name="json"
              placeholder='[{"id":"local-zk","name":"Local ZooKeeper","hosts":"127.0.0.1:2181"}]'
              rows={8}
              value={json}
              onChange={(event) => setJson(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label className="dialog__field">
              <span>连接名称</span>
              <input
                aria-label="connection name"
                name="name"
                placeholder="例如：本地开发 ZooKeeper"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="dialog__field">
              <span>地址</span>
              <input
                aria-label="connection hosts"
                name="hosts"
                placeholder="127.0.0.1:2181"
                type="text"
                value={hosts}
                onChange={(event) => setHosts(event.target.value)}
              />
            </label>
            <label className="dialog__field">
              <span>Chroot（可选）</span>
              <input
                aria-label="connection chroot"
                name="chroot"
                placeholder="/dev"
                type="text"
                value={chroot}
                onChange={(event) => setChroot(event.target.value)}
              />
            </label>
          </>
        )}

        {dialogError ? <div role="alert">{dialogError}</div> : null}

        <div className="dialog__actions">
          <button type="button" onClick={closeDialog}>
            关闭
          </button>
          <button
            aria-label={isImportMode ? 'import connection json' : 'save connection'}
            className="button-primary"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '提交中...' : isImportMode ? '导入' : '保存连接'}
          </button>
        </div>
      </form>
    </div>
  )
}
