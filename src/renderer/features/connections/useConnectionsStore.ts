import { useSyncExternalStore } from 'react'

import type { StoredConnection } from '../../../shared/models/connection'

type ConnectionsState = {
  items: StoredConnection[]
  dialogOpen: boolean
}

const listeners = new Set<() => void>()

let state: ConnectionsState = {
  items: [],
  dialogOpen: false,
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(next: Partial<ConnectionsState>) {
  state = { ...state, ...next }
  emitChange()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

async function load() {
  if (!window.zkube?.connections.list) {
    return
  }

  const items = await window.zkube.connections.list()
  setState({ items })
}

async function connect(connectionId: string) {
  if (!window.zkube?.connections.connect) {
    return
  }

  await window.zkube.connections.connect(connectionId)
}

async function exportAll() {
  if (!window.zkube?.connections.exportAll) {
    return
  }

  await window.zkube.connections.exportAll()
}

function openDialog() {
  setState({ dialogOpen: true })
}

function closeDialog() {
  setState({ dialogOpen: false })
}

export function useConnectionsStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    load,
    connect,
    exportAll,
    openDialog,
    closeDialog,
  }
}
