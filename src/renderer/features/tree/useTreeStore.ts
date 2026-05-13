import { useSyncExternalStore } from 'react'

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

async function loadChildren(path: string) {
  if (!window.zkube?.zookeeper.loadChildren || isLoading(path)) {
    return
  }

  setLoading(path, true)

  try {
    const children = await window.zkube.zookeeper.loadChildren(path)
    setState({
      childrenByPath: {
        ...state.childrenByPath,
        [path]: children,
      },
      feedback: null,
      loadingPaths: state.loadingPaths.filter((entry) => entry !== path),
    })
  } catch (error) {
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
  setState({ query, searchResults: query ? state.searchResults : [] })
}

async function runDeepSearch() {
  const query = state.query.trim()

  if (!query || !window.zkube?.zookeeper.search) {
    setState({
      searchResults: [],
      feedback: query ? null : '请输入节点关键词。',
    })
    return
  }

  try {
    const searchResults = await window.zkube.zookeeper.search(query)
    setState({ searchResults, feedback: null })
  } catch (error) {
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

    const nextChildrenByPath = Object.fromEntries(
      Object.entries(state.childrenByPath).map(([path, children]) => [
        path,
        children.filter((entry) => entry !== '/demo-node'),
      ]),
    )

    setState({
      childrenByPath: nextChildrenByPath,
      expandedPaths: state.expandedPaths.filter((entry) => entry !== '/demo-node'),
      searchResults: state.searchResults.filter((entry) => entry !== '/demo-node'),
      feedback: '已删除演示节点 /demo-node',
    })
  } catch (error) {
    setState({ feedback: getErrorMessage(error) })
  }
}

export function resetTreeStore() {
  state = initialState
  emitChange()
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
  }
}
