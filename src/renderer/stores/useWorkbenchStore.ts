import { create } from 'zustand'

import type { NodeSnapshot } from '../../shared/models/node'

export type WorkbenchPane = 'Data' | 'Meta' | 'ACL'
export type WorkbenchLoadState = 'idle' | 'loading' | 'ready' | 'error'

export type WorkbenchTab = {
  path: string
  title: string
  activePane: WorkbenchPane
  draft: string
  savedDraft: string
  stat: NodeSnapshot['stat']
  acl: NodeSnapshot['acl']
  loadState: WorkbenchLoadState
  saving: boolean
  error: string | null
}

type WorkbenchState = {
  activePath: string | null
  defaultNodePath: string
  tabs: WorkbenchTab[]
  ensureDefaultTab: () => void
  setActiveTab: (path: string) => void
  setActivePane: (path: string, pane: WorkbenchPane) => void
  setDraft: (path: string, draft: string) => void
  setAcl: (path: string, acl: NodeSnapshot['acl']) => void
  applyFormatter: (path: string, formatter: (input: string) => string) => void
  loadTab: (path: string) => Promise<void>
  saveTab: (path: string) => Promise<void>
}

const defaultNodePath = '/config/service'
const defaultStat = {
  version: 0,
  numChildren: 0,
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

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
    loadState: 'idle',
    saving: false,
    error: null,
  }
}

function upsertTab(
  tabs: WorkbenchTab[],
  path: string,
  updater: (tab: WorkbenchTab) => WorkbenchTab,
) {
  const nextTabs = tabs.some((tab) => tab.path === path)
    ? tabs
    : [...tabs, createTab(path)]

  return nextTabs.map((tab) => (tab.path === path ? updater(tab) : tab))
}

function initialState() {
  return {
    activePath: defaultNodePath,
    defaultNodePath,
    tabs: [],
  }
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  ...initialState(),
  ensureDefaultTab: () => {
    const { activePath, defaultNodePath: path, tabs } = get()

    if (tabs.some((tab) => tab.path === path)) {
      if (!activePath) {
        set({ activePath: path })
      }
      return
    }

    set({
      activePath: path,
      tabs: [...tabs, createTab(path)],
    })
  },
  setActiveTab: (path) => {
    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => tab),
    }))
  },
  setActivePane: (path, pane) => {
    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => ({
        ...tab,
        activePane: pane,
      })),
    }))
  },
  setDraft: (path, draft) => {
    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => ({
        ...tab,
        draft,
        error: null,
      })),
    }))
  },
  setAcl: (path, acl) => {
    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => ({
        ...tab,
        acl,
        error: null,
      })),
    }))
  },
  applyFormatter: (path, formatter) => {
    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => ({
        ...tab,
        draft: formatter(tab.draft),
        error: null,
      })),
    }))
  },
  loadTab: async (path) => {
    if (!window.zkube?.zookeeper.open) {
      return
    }

    const currentTab = get().tabs.find((tab) => tab.path === path) ?? createTab(path)
    if (currentTab.loadState === 'loading' || currentTab.loadState === 'ready') {
      return
    }

    set((state) => ({
      activePath: path,
      tabs: upsertTab(state.tabs, path, (tab) => ({
        ...tab,
        loadState: 'loading',
        error: null,
      })),
    }))

    try {
      const snapshot = await window.zkube.zookeeper.open(path)
      const draft = decoder.decode(snapshot.data)

      set((state) => ({
        activePath: path,
        tabs: upsertTab(state.tabs, path, (tab) => ({
          ...tab,
          draft,
          savedDraft: draft,
          stat: snapshot.stat,
          acl: snapshot.acl,
          loadState: 'ready',
          error: null,
        })),
      }))
    } catch (error) {
      set((state) => ({
        activePath: path,
        tabs: upsertTab(state.tabs, path, (tab) => ({
          ...tab,
          loadState: 'error',
          error: getErrorMessage(error),
        })),
      }))
    }
  },
  saveTab: async (path) => {
    const currentTab = get().tabs.find((tab) => tab.path === path)

    if (
      !currentTab ||
      currentTab.loadState !== 'ready' ||
      currentTab.saving ||
      !window.zkube?.zookeeper.update
    ) {
      return
    }

    const draftToSave = currentTab.draft
    const versionToSave = currentTab.stat.version

    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path
          ? {
              ...tab,
              saving: true,
              error: null,
            }
          : tab,
      ),
    }))

    try {
      await window.zkube.zookeeper.update(
        path,
        encoder.encode(draftToSave),
        versionToSave,
      )

      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.path === path
            ? {
                ...tab,
                savedDraft: draftToSave,
                stat: {
                  ...tab.stat,
                  version: Math.max(tab.stat.version, versionToSave + 1),
                },
                saving: false,
                error: null,
              }
            : tab,
        ),
      }))
    } catch (error) {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.path === path
            ? {
                ...tab,
                saving: false,
                error: getErrorMessage(error),
              }
            : tab,
        ),
      }))
    }
  },
}))

export function resetWorkbenchStore() {
  useWorkbenchStore.setState(initialState())
}
