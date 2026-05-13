import { useSyncExternalStore } from 'react'

import type { StoredConnection } from '../../../shared/models/connection'

type ConnectionsState = {
  items: StoredConnection[]
  dialogOpen: boolean
  feedback: string | null
  exportPreview: string | null
}

const initialState: ConnectionsState = {
  items: [],
  dialogOpen: false,
  feedback: null,
  exportPreview: null,
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

  return '操作失败，请稍后重试。'
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
      feedback: '导出内容已就绪',
    })
  } catch (error) {
    setState({
      exportPreview: null,
      feedback: getErrorMessage(error),
    })
  }
}

function openDialog() {
  setState({ dialogOpen: true })
}

function closeDialog() {
  setState({ dialogOpen: false })
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
    exportAll,
    openDialog,
    closeDialog,
  }
}
