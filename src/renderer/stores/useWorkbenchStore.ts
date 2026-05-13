import { useSyncExternalStore } from 'react'

import type { NodeSnapshot } from '../../shared/models/node'

export type WorkbenchPane = 'Data' | 'Meta' | 'ACL'

export type WorkbenchTab = {
  path: string
  title: string
  activePane: WorkbenchPane
  draft: string
  savedDraft: string
  stat: NodeSnapshot['stat']
  acl: NodeSnapshot['acl']
  hasLoaded: boolean
  loading: boolean
  saving: boolean
  error: string | null
}

type WorkbenchState = {
  activePath: string | null
  tabs: WorkbenchTab[]
}

const defaultNodePath = '/config/service'
const defaultStat = {
  version: 0,
  numChildren: 0,
}

const initialState: WorkbenchState = {
  activePath: defaultNodePath,
  tabs: [],
}

const listeners = new Set<() => void>()
const encoder = new TextEncoder()
const decoder = new TextDecoder()

let state: WorkbenchState = initialState

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(next: WorkbenchState) {
  state = next
  emitChange()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to complete the node action.'
}

function toTitle(path: string) {
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) ?? '/'
}

function createTab(path: string): WorkbenchTab {
  return {
    path,
    title: toTitle(path),
    activePane: 'Data',
    draft: '',
    savedDraft: '',
    stat: defaultStat,
    acl: [],
    hasLoaded: false,
    loading: false,
    saving: false,
    error: null,
  }
}

function updateTab(
  path: string,
  updater: (tab: WorkbenchTab) => WorkbenchTab,
) {
  const nextTabs = (state.tabs.some((tab) => tab.path === path)
    ? state.tabs
    : [...state.tabs, createTab(path)]).map((tab) =>
    tab.path === path ? updater(tab) : tab,
  )

  setState({
    ...state,
    activePath: path,
    tabs: nextTabs,
  })
}

function ensureDefaultTab() {
  if (state.tabs.some((tab) => tab.path === defaultNodePath)) {
    if (!state.activePath) {
      setState({
        ...state,
        activePath: defaultNodePath,
      })
    }
    return
  }

  setState({
    ...state,
    activePath: defaultNodePath,
    tabs: [...state.tabs, createTab(defaultNodePath)],
  })
}

function setActiveTab(path: string) {
  updateTab(path, (tab) => tab)
}

function setActivePane(path: string, pane: WorkbenchPane) {
  updateTab(path, (tab) => ({
    ...tab,
    activePane: pane,
  }))
}

function setDraft(path: string, draft: string) {
  updateTab(path, (tab) => ({
    ...tab,
    draft,
    error: null,
  }))
}

function applyFormatter(path: string, formatter: (input: string) => string) {
  updateTab(path, (tab) => ({
    ...tab,
    draft: formatter(tab.draft),
    error: null,
  }))
}

async function loadTab(path: string) {
  if (!window.zkube?.zookeeper.open) {
    ensureDefaultTab()
    return
  }

  updateTab(path, (tab) => ({
    ...tab,
    loading: true,
    error: null,
  }))

  try {
    const snapshot = await window.zkube.zookeeper.open(path)
    const draft = decoder.decode(snapshot.data)

    updateTab(path, (tab) => ({
      ...tab,
      draft,
      savedDraft: draft,
      stat: snapshot.stat,
      acl: snapshot.acl,
      hasLoaded: true,
      loading: false,
      error: null,
    }))
  } catch (error) {
    updateTab(path, (tab) => ({
      ...tab,
      loading: false,
      error: getErrorMessage(error),
    }))
  }
}

async function saveTab(path: string) {
  const tab = state.tabs.find((entry) => entry.path === path)

  if (!tab || !window.zkube?.zookeeper.update) {
    return
  }

  updateTab(path, (current) => ({
    ...current,
    saving: true,
    error: null,
  }))

  try {
    await window.zkube.zookeeper.update(
      path,
      encoder.encode(tab.draft),
      tab.stat.version,
    )

    updateTab(path, (current) => ({
      ...current,
      savedDraft: current.draft,
      saving: false,
      error: null,
    }))
  } catch (error) {
    updateTab(path, (current) => ({
      ...current,
      saving: false,
      error: getErrorMessage(error),
    }))
  }
}

export function resetWorkbenchStore() {
  state = initialState
  emitChange()
}

export function useWorkbenchStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    defaultNodePath,
    ensureDefaultTab,
    setActiveTab,
    setActivePane,
    setDraft,
    applyFormatter,
    loadTab,
    saveTab,
  }
}
