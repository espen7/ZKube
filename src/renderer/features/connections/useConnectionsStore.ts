import { useSyncExternalStore } from 'react'

import type {
  ConnectionDraft,
  StoredConnection,
} from '../../../shared/models/connection'
import type {
  ConnectionState,
  RuntimeEvent,
} from '../../../shared/models/node'
import { translate } from '../../i18n'
import { getPreferencesSnapshot } from '../settings/useThemeStore'

type ConnectionsState = {
  items: StoredConnection[]
  dialogOpen: boolean
  dialogError: string | null
  feedback: string | null
  submitting: boolean
  activeConnectionId: string | null
  connectionState: ConnectionState
}

const initialState: ConnectionsState = {
  items: [],
  dialogOpen: false,
  dialogError: null,
  feedback: null,
  submitting: false,
  activeConnectionId: null,
  connectionState: 'disconnected',
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

function t(key: string, variables?: Record<string, string | number>) {
  return translate(getPreferencesSnapshot().language, key, variables)
}

function createConnectionId(name: string) {
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
    })
  }
}

async function connect(connectionId: string) {
  if (!window.zkube?.connections.connect) {
    return
  }

  const previousActiveConnectionId = state.activeConnectionId
  const previousConnectionState = state.connectionState

  setState({
    activeConnectionId: connectionId,
    connectionState:
      previousActiveConnectionId && previousActiveConnectionId !== connectionId
        ? 'reconnecting'
        : 'connecting',
    feedback: null,
  })

  try {
    await window.zkube.connections.connect(connectionId)
  } catch (error) {
    setState({
      activeConnectionId: previousActiveConnectionId,
      connectionState: previousActiveConnectionId
        ? previousConnectionState
        : 'disconnected',
      feedback: getErrorMessage(error),
    })
  }
}

async function disconnect() {
  if (!window.zkube?.zookeeper.disconnect) {
    return
  }

  try {
    await window.zkube.zookeeper.disconnect()
    setState({ feedback: null })
  } catch (error) {
    setState({ feedback: getErrorMessage(error) })
  }
}

async function importFromFile() {
  if (!window.zkube?.connections.importFromFile) {
    return
  }

  try {
    const items = await window.zkube.connections.importFromFile()
    if (!items) {
      return
    }

    setState({
      items,
      feedback: t('connection.imported'),
      dialogError: null,
    })
  } catch (error) {
    setState({
      feedback: getErrorMessage(error),
    })
  }
}

async function exportToFile() {
  if (!window.zkube?.connections.exportToFile) {
    return
  }

  try {
    const result = await window.zkube.connections.exportToFile()
    if (!result) {
      return
    }

    setState({
      feedback: t('connection.exported', { filePath: result.filePath }),
    })
  } catch (error) {
    setState({
      feedback: getErrorMessage(error),
    })
  }
}

function openCreateDialog() {
  setState({
    dialogOpen: true,
    dialogError: null,
  })
}

function closeDialog() {
  setState({
    dialogOpen: false,
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
    const message = t('connection.validation')
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
      dialogOpen: false,
      dialogError: null,
      feedback: t('connection.saved'),
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

async function deleteConnection(connectionId: string) {
  if (!window.zkube?.connections.delete) {
    return
  }

  try {
    await window.zkube.connections.delete(connectionId)
    setState({
      items: state.items.filter((item) => item.id !== connectionId),
      feedback: t('connection.deleted'),
    })
  } catch (error) {
    setState({
      feedback: getErrorMessage(error),
    })
  }
}

function handleRuntimeEvent(event: RuntimeEvent) {
  if (event.type !== 'connectionStateChanged') {
    return
  }

  switch (event.state) {
    case 'disconnected':
      setState({
        activeConnectionId: null,
        connectionState: 'disconnected',
      })
      return
    case 'connecting':
    case 'connected':
    case 'reconnecting':
      setState({
        connectionState: event.state,
        feedback: null,
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
    load,
    connect,
    disconnect,
    importFromFile,
    exportToFile,
    deleteConnection,
    openCreateDialog,
    closeDialog,
    saveConnection,
    handleRuntimeEvent,
  }
}
