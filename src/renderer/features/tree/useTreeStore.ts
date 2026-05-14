import { useSyncExternalStore } from 'react'

import type { RuntimeEvent } from '../../../shared/models/node'

type TreeState = {
  childrenByPath: Record<string, string[]>
  expandedPaths: string[]
  loadingPaths: string[]
  query: string
  searchResults: string[]
  feedback: string | null
}

const initialState: TreeState = {
  childrenByPath: {},
  expandedPaths: [],
  loadingPaths: [],
  query: '',
  searchResults: [],
  feedback: null,
}

const listeners = new Set<() => void>()

let state: TreeState = initialState
let latestSearchRequestId = 0
let nextLoadRequestId = 0
const loadRequestIds = new Map<string, number>()
let rootLoadTimer: ReturnType<typeof setTimeout> | null = null

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(next: Partial<TreeState>) {
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

function cancelPendingSearches() {
  latestSearchRequestId += 1
  return latestSearchRequestId
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '节点操作失败，请稍后重试。'
}

function isLoading(path: string) {
  return state.loadingPaths.includes(path)
}

function setLoading(path: string, loading: boolean) {
  const nextLoadingPaths = loading
    ? Array.from(new Set([...state.loadingPaths, path]))
    : state.loadingPaths.filter((entry) => entry !== path)

  setState({ loadingPaths: nextLoadingPaths })
}

function joinChildPath(parentPath: string, childPath: string) {
  if (!childPath || childPath === '/') {
    return '/'
  }

  if (childPath.startsWith('/')) {
    return childPath
  }

  return parentPath === '/' ? `/${childPath}` : `${parentPath}/${childPath}`
}

function isSameOrDescendantPath(candidatePath: string, targetPath: string) {
  if (targetPath === '/') {
    return candidatePath.startsWith('/')
  }

  return (
    candidatePath === targetPath ||
    candidatePath.startsWith(`${targetPath}/`)
  )
}

function cancelLoadsForPath(targetPath: string) {
  for (const path of Array.from(loadRequestIds.keys())) {
    if (isSameOrDescendantPath(path, targetPath)) {
      loadRequestIds.delete(path)
    }
  }
}

function isCurrentLoad(path: string, requestId: number) {
  return loadRequestIds.get(path) === requestId
}

function beginLoad(path: string) {
  const requestId = nextLoadRequestId + 1
  nextLoadRequestId = requestId
  loadRequestIds.set(path, requestId)
  setLoading(path, true)
  return requestId
}

function completeLoad(path: string, requestId: number) {
  if (loadRequestIds.get(path) === requestId) {
    loadRequestIds.delete(path)
  }
}

function invalidateBranch(targetPath: string, options?: { removePath?: boolean }) {
  const removePath = options?.removePath ?? false
  cancelLoadsForPath(targetPath)
  const nextChildrenByPath = Object.fromEntries(
    Object.entries(state.childrenByPath)
      .filter(([path]) => {
        if (path === targetPath) {
          return !removePath
        }

        return !isSameOrDescendantPath(path, targetPath)
      })
      .map(([path, children]) => [
        path,
        removePath
          ? children.filter(
              (childPath) => !isSameOrDescendantPath(childPath, targetPath),
            )
          : children,
      ]),
  )

  const nextExpandedPaths = state.expandedPaths.filter((path) => {
    if (path === targetPath) {
      return !removePath
    }

    return !isSameOrDescendantPath(path, targetPath)
  })

  const nextLoadingPaths = state.loadingPaths.filter(
    (path) => !isSameOrDescendantPath(path, targetPath),
  )

  const nextSearchResults = state.searchResults.filter((path) => {
    if (path === targetPath) {
      return !removePath
    }

    return !isSameOrDescendantPath(path, targetPath)
  })

  setState({
    childrenByPath: nextChildrenByPath,
    expandedPaths: nextExpandedPaths,
    loadingPaths: nextLoadingPaths,
    searchResults: nextSearchResults,
  })
}

async function loadChildren(path: string) {
  if (!window.zkube?.zookeeper.loadChildren || isLoading(path)) {
    return
  }

  const requestId = beginLoad(path)

  try {
    const children = (await window.zkube.zookeeper.loadChildren(path)).map(
      (childPath) => joinChildPath(path, childPath),
    )

    if (!isCurrentLoad(path, requestId)) {
      return
    }

    completeLoad(path, requestId)
    setState({
      childrenByPath: {
        ...state.childrenByPath,
        [path]: children,
      },
      feedback: null,
      loadingPaths: state.loadingPaths.filter((entry) => entry !== path),
    })
  } catch (error) {
    if (!isCurrentLoad(path, requestId)) {
      return
    }

    completeLoad(path, requestId)
    setState({
      feedback: getErrorMessage(error),
      loadingPaths: state.loadingPaths.filter((entry) => entry !== path),
    })
  }
}

async function loadRoot() {
  await loadChildren('/')
}

async function toggleNode(path: string) {
  const isExpanded = state.expandedPaths.includes(path)

  if (isExpanded) {
    setState({
      expandedPaths: state.expandedPaths.filter((entry) => entry !== path),
    })
    return
  }

  setState({
    expandedPaths: [...state.expandedPaths, path],
  })

  if (!state.childrenByPath[path]) {
    await loadChildren(path)
  }
}

function setQuery(query: string) {
  cancelPendingSearches()

  setState({
    query,
    searchResults: state.query === query ? state.searchResults : [],
  })
}

async function runDeepSearch() {
  const query = state.query.trim()

  if (!query || !window.zkube?.zookeeper.search) {
    cancelPendingSearches()
    setState({
      searchResults: [],
      feedback: query ? null : '请输入节点关键词。',
    })
    return
  }

  const requestId = cancelPendingSearches()

  try {
    const searchResults = await window.zkube.zookeeper.search(query)

    if (requestId !== latestSearchRequestId || state.query.trim() !== query) {
      return
    }

    setState({ searchResults, feedback: null })
  } catch (error) {
    if (requestId !== latestSearchRequestId || state.query.trim() !== query) {
      return
    }

    setState({
      searchResults: [],
      feedback: getErrorMessage(error),
    })
  }
}

async function createDemoNode() {
  if (!window.zkube?.zookeeper.create) {
    return
  }

  try {
    await window.zkube.zookeeper.create(
      '/demo-node',
      new TextEncoder().encode('demo value'),
    )

    const rootChildren = state.childrenByPath['/'] ?? []
    const nextRootChildren = rootChildren.includes('/demo-node')
      ? rootChildren
      : [...rootChildren, '/demo-node']

    setState({
      childrenByPath: {
        ...state.childrenByPath,
        ...(state.childrenByPath['/'] ? { '/': nextRootChildren } : {}),
      },
      feedback: '已创建演示节点 /demo-node',
    })
  } catch (error) {
    setState({ feedback: getErrorMessage(error) })
  }
}

async function deleteDemoNode() {
  if (!window.zkube?.zookeeper.delete) {
    return
  }

  try {
    await window.zkube.zookeeper.delete('/demo-node')
    invalidateBranch('/demo-node', { removePath: true })

    setState({
      feedback: '已删除演示节点 /demo-node',
    })
  } catch (error) {
    setState({ feedback: getErrorMessage(error) })
  }
}

export function resetTreeStore() {
  if (rootLoadTimer) {
    clearTimeout(rootLoadTimer)
    rootLoadTimer = null
  }

  cancelPendingSearches()
  loadRequestIds.clear()
  state = initialState
  emitChange()
}

async function refreshBranch(path: string) {
  const shouldReload =
    path === '/' ||
    path in state.childrenByPath ||
    state.expandedPaths.includes(path) ||
    state.loadingPaths.includes(path)

  invalidateBranch(path)

  if (shouldReload) {
    await loadChildren(path)
  }
}

async function handleRuntimeEvent(event: RuntimeEvent) {
  switch (event.type) {
    case 'connectionStateChanged':
      resetTreeStore()

      if (event.state === 'connected') {
        rootLoadTimer = setTimeout(() => {
          rootLoadTimer = null
          void loadRoot()
        }, 0)
      }

      return
    case 'nodeChildrenChanged':
      cancelPendingSearches()
      await refreshBranch(event.path)
      return
    case 'nodeDeleted':
      cancelPendingSearches()
      invalidateBranch(event.path, { removePath: true })
      return
    case 'nodeDataChanged':
      return
  }
}

export function useTreeStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    loadRoot,
    toggleNode,
    setQuery,
    runDeepSearch,
    createDemoNode,
    deleteDemoNode,
    handleRuntimeEvent,
  }
}
