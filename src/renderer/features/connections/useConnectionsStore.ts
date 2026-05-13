import { useSyncExternalStore } from 'react'

import type {
  ConnectionDraft,
  StoredConnection,
} from '../../../shared/models/connection'

type DialogMode = 'create' | 'import' | null

type ConnectionsState = {
  items: StoredConnection[]
  dialogMode: DialogMode
  dialogError: string | null
  feedback: string | null
  exportPreview: string | null
  submitting: boolean
}

const initialState: ConnectionsState = {
  items: [],
  dialogMode: null,
  dialogError: null,
  feedback: null,
  exportPreview: null,
  submitting: false,
}

const listeners = new Set<() => void>()

let state: ConnectionsState = initialState

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Operation failed. Please try again.'
}

function createConnectionId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const base = slug || 'connection'
  return `${base}-${Date.now().toString(36)}`
}

function upsertConnection(
  items: StoredConnection[],
  next: StoredConnection,
): StoredConnection[] {
  const withoutCurrent = items.filter((item) => item.id !== next.id)
  return [...withoutCurrent, next]
}

async function load() {
  if (!window.zkube?.connections.list) {
    return
  }

  try {
    const items = await window.zkube.connections.list()
    setState({ items, feedback: null })
  } catch (error) {
    setState({
      items: [],
      feedback: getErrorMessage(error),
      exportPreview: null,
    })
  }
}

async function connect(connectionId: string) {
  if (!window.zkube?.connections.connect) {
    return
  }

  try {
    await window.zkube.connections.connect(connectionId)
    setState({ feedback: null })
  } catch (error) {
    setState({ feedback: getErrorMessage(error) })
  }
}

async function exportAll() {
  if (!window.zkube?.connections.exportAll) {
    return
  }

  try {
    const content = await window.zkube.connections.exportAll()
    setState({
      exportPreview: content,
      feedback: 'Connections exported.',
    })
  } catch (error) {
    setState({
      exportPreview: null,
      feedback: getErrorMessage(error),
    })
  }
}

function openCreateDialog() {
  setState({
    dialogMode: 'create',
    dialogError: null,
  })
}

function openImportDialog() {
  setState({
    dialogMode: 'import',
    dialogError: null,
  })
}

function closeDialog() {
  setState({
    dialogMode: null,
    dialogError: null,
    submitting: false,
  })
}

async function saveConnection(input: {
  name: string
  hosts: string
  chroot?: string
}) {
  if (!window.zkube?.connections.save) {
    return
  }

  const draft: ConnectionDraft = {
    id: createConnectionId(input.name),
    name: input.name.trim(),
    hosts: input.hosts.trim(),
    chroot: input.chroot?.trim() || undefined,
  }

  if (!draft.name || !draft.hosts) {
    const message = 'Name and hosts are required.'
    setState({ dialogError: message, feedback: message })
    return
  }

  setState({
    dialogError: null,
    feedback: null,
    submitting: true,
  })

  try {
    const saved = await window.zkube.connections.save(draft)
    setState({
      items: upsertConnection(state.items, saved),
      dialogMode: null,
      dialogError: null,
      feedback: 'Connection saved.',
      exportPreview: null,
      submitting: false,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    setState({
      dialogError: message,
      feedback: message,
      submitting: false,
    })
  }
}

async function importConnections(rawJson: string) {
  if (!window.zkube?.connections.importJson) {
    return
  }

  const json = rawJson.trim()
  if (!json) {
    const message = 'Connection JSON is required.'
    setState({ dialogError: message, feedback: message })
    return
  }

  setState({
    dialogError: null,
    feedback: null,
    submitting: true,
  })

  try {
    const items = await window.zkube.connections.importJson(json)
    setState({
      items,
      dialogMode: null,
      dialogError: null,
      feedback: 'Connections imported.',
      exportPreview: null,
      submitting: false,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    setState({
      dialogError: message,
      feedback: message,
      submitting: false,
    })
  }
}

export function resetConnectionsStore() {
  state = initialState
  emitChange()
}

export function useConnectionsStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    dialogOpen: snapshot.dialogMode !== null,
    load,
    connect,
    exportAll,
    openCreateDialog,
    openImportDialog,
    closeDialog,
    saveConnection,
    importConnections,
  }
}
