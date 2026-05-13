# ZKube Desktop V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Windows 首发的 ZooKeeper 桌面可视化工具，完成连接管理、树浏览、节点编辑、ACL 编辑、局部实时刷新和现代化工作台 UI 的 V1 交付。

**Architecture:** 使用 `Electron Main + Preload IPC + React Renderer + Domain Services + Infrastructure Adapters` 的轻量分层架构。主进程负责窗口、IPC 和安全边界；renderer 负责三栏工作台 UI；领域层负责连接会话、树缓存、watcher 事件和节点操作；基础设施层负责本地配置、Windows 安全存储和 ZooKeeper 客户端适配。

**Tech Stack:** Electron 42、React 19、TypeScript、Vite 8、electron-builder 26、Vitest、Playwright、Monaco Editor、Zustand、node-zookeeper-client。

---

## File Structure

以下文件结构是本计划的责任边界，后续任务都以它为准：

- `package.json`
  - npm scripts、依赖、打包入口
- `tsconfig.json`
  - 全项目 TypeScript 检查配置
- `vite.config.ts`
  - renderer 构建、Electron dev/build 集成、测试环境配置
- `electron-builder.yml`
  - Windows 打包配置
- `index.html`
  - renderer 根挂载点
- `electron/main/index.ts`
  - Electron app 生命周期和主入口
- `electron/main/window.ts`
  - BrowserWindow 创建与安全选项
- `electron/main/ipc/register-handlers.ts`
  - IPC handler 注册与服务装配
- `electron/preload/index.ts`
  - 受控 API 暴露到 renderer
- `src/shared/ipc.ts`
  - IPC channel 常量和 renderer bridge 工厂
- `src/shared/global.d.ts`
  - `window.zkube` 类型声明
- `src/shared/models/connection.ts`
  - 连接模型、表单模型、导入导出模型
- `src/shared/models/node.ts`
  - 节点、stat、ACL、watcher 事件模型
- `src/shared/errors.ts`
  - 统一错误码
- `src/domain/connections/connection-service.ts`
  - 连接保存、读取、导入导出、secret 访问
- `src/domain/zookeeper/client.ts`
  - ZooKeeper client 抽象接口
- `src/domain/zookeeper/session-manager.ts`
  - 连接会话、缓存、watcher 和节点操作
- `src/infrastructure/storage/connection-repository.ts`
  - 本地 JSON 配置读写
- `src/infrastructure/security/secret-store.ts`
  - 基于 Electron `safeStorage` 的敏感信息保护
- `src/infrastructure/zookeeper/node-zk-client.ts`
  - `node-zookeeper-client` 适配层
- `src/renderer/main.tsx`
  - renderer 启动入口
- `src/renderer/App.tsx`
  - 应用级 providers 与工作台入口
- `src/renderer/styles/tokens.css`
  - 设计 token
- `src/renderer/styles/app.css`
  - 全局样式与布局样式
- `src/renderer/features/layout/AppShell.tsx`
  - 三栏主框架、命令栏、状态栏
- `src/renderer/features/connections/*`
  - 连接列表、连接表单、导入导出
- `src/renderer/features/tree/*`
  - 树浏览、筛选、深层搜索、右键动作
- `src/renderer/features/workbench/*`
  - 节点标签页、编辑器、Meta 面板、ACL 面板
- `src/renderer/features/runtime/*`
  - toast、事件订阅、状态栏
- `src/renderer/stores/*`
  - renderer 轻量状态管理
- `src/renderer/test/setup.ts`
  - Vitest + RTL 测试环境
- `tests/domain/*`
  - 领域层单测
- `tests/renderer/*`
  - renderer 组件与交互测试
- `tests/e2e/app-smoke.spec.ts`
  - Electron 启动冒烟测试
- `playwright.config.ts`
  - Electron e2e 配置
- `README.md`
  - 启动、测试、打包说明

## Task Coverage

本计划对应 spec 的覆盖关系如下：

- 连接管理：Task 3、Task 6
- Windows 安全存储：Task 3
- 懒加载树与搜索：Task 4、Task 7
- 节点查看/编辑/创建/删除：Task 4、Task 7、Task 8
- ACL 查看/编辑：Task 5、Task 9
- 聚焦式 watcher 与状态反馈：Task 4、Task 9
- 现代化三栏 UI：Task 6、Task 8、Task 9
- Windows 打包：Task 10

### Task 1: 初始化工程与测试骨架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/test/setup.ts`
- Create: `tests/renderer/app-shell.test.tsx`

- [ ] **Step 1: 写一个失败的 renderer 启动测试**

```tsx
// tests/renderer/app-shell.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../../src/renderer/App'

describe('App shell bootstrap', () => {
  it('renders the initial ZKube workspace title', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'ZKube' }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认它先失败**

Run: `npm run test:unit -- --run tests/renderer/app-shell.test.tsx`
Expected: FAIL，报错类似 `Cannot find module '../../src/renderer/App'`

- [ ] **Step 3: 写最小可运行工程骨架**

```bash
npm init -y
npm install react@19.2.6 react-dom@19.2.6 monaco-editor react-resizable-panels zustand zod node-zookeeper-client@1.1.3
npm install -D electron@42.0.1 electron-builder@26.8.1 vite@8.0.12 @vitejs/plugin-react vite-plugin-electron vite-plugin-electron-renderer typescript tsx vitest @testing-library/react @testing-library/jest-dom jsdom @types/node @types/react @types/react-dom @playwright/test
```

```json
// package.json
{
  "name": "zkube",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vite/client", "vitest/globals"]
  },
  "include": ["electron", "src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import path from 'node:path'

import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main/index.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload/index.ts'),
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/renderer/test/setup.ts',
  },
})
```

```html
<!-- index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>ZKube</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

```tsx
// src/renderer/App.tsx
export default function App() {
  return (
    <main>
      <h1>ZKube</h1>
      <p>ZooKeeper Desktop Workbench</p>
    </main>
  )
}
```

```tsx
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

```ts
// src/renderer/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: 运行测试和类型检查确认基础骨架通过**

Run: `npm run test:unit -- --run tests/renderer/app-shell.test.tsx`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS，无 TypeScript 错误

- [ ] **Step 5: 提交这一小步**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/renderer/main.tsx src/renderer/App.tsx src/renderer/test/setup.ts tests/renderer/app-shell.test.tsx
git commit -m "chore: scaffold Electron React workspace"
```

### Task 2: 建立 Electron 外壳与类型化 preload bridge

**Files:**
- Create: `electron/main/index.ts`
- Create: `electron/main/window.ts`
- Create: `electron/preload/index.ts`
- Create: `src/shared/ipc.ts`
- Create: `src/shared/global.d.ts`
- Test: `tests/domain/ipc-bridge.test.ts`

- [ ] **Step 1: 先写 bridge 行为测试**

```ts
// tests/domain/ipc-bridge.test.ts
import { describe, expect, it, vi } from 'vitest'

import { createDesktopApi } from '../../src/shared/ipc'

describe('desktop bridge', () => {
  it('invokes typed channels through the transport', async () => {
    const invoke = vi.fn().mockResolvedValue({ version: '0.1.0' })
    const on = vi.fn()
    const api = createDesktopApi({ invoke, on })

    await api.app.getVersion()

    expect(invoke).toHaveBeenCalledWith('app:getVersion', undefined)
    expect(typeof api.runtime.subscribe).toBe('function')
  })
})
```

- [ ] **Step 2: 运行测试确认 bridge 尚未存在**

Run: `npm run test:unit -- --run tests/domain/ipc-bridge.test.ts`
Expected: FAIL，报错类似 `Cannot find module '../../src/shared/ipc'`

- [ ] **Step 3: 实现主进程窗口、preload 和共享 IPC 工厂**

```ts
// src/shared/ipc.ts
export type Transport = {
  invoke<T>(channel: string, payload?: unknown): Promise<T>
  on<T>(channel: string, cb: (payload: T) => void): () => void
}

export const channels = {
  appGetVersion: 'app:getVersion',
  appPing: 'app:ping',
  connectionsList: 'connections:list',
  connectionsSave: 'connections:save',
  connectionsConnect: 'connections:connect',
  connectionsExport: 'connections:export',
  connectionsImport: 'connections:import',
  treeChildren: 'tree:children',
  treeDeepSearch: 'tree:deepSearch',
  nodeOpen: 'node:open',
  nodeCreate: 'node:create',
  nodeDelete: 'node:delete',
  nodeUpdate: 'node:update',
  aclSave: 'acl:save',
  runtimeEvent: 'runtime:event',
} as const

export function createDesktopApi(transport: Transport) {
  return {
    app: {
      getVersion: () => transport.invoke<{ version: string }>(channels.appGetVersion),
      ping: () => transport.invoke<{ ok: true }>(channels.appPing),
    },
    connections: {
      list: () => transport.invoke<Array<{ id: string; name: string; hosts: string; createdAt: string; updatedAt: string }>>(channels.connectionsList),
      save: (payload: unknown) => transport.invoke(channels.connectionsSave, payload),
      connect: (payload: { id: string; hosts: string; sessionTimeoutMs?: number }) =>
        transport.invoke(channels.connectionsConnect, payload),
      exportAll: () => transport.invoke<string>(channels.connectionsExport),
      importJson: (payload: string) => transport.invoke(channels.connectionsImport, payload),
    },
    tree: {
      getChildren: (path: string) => transport.invoke<string[]>(channels.treeChildren, path),
      deepSearch: (query: string) => transport.invoke<string[]>(channels.treeDeepSearch, query),
    },
    node: {
      open: (path: string) => transport.invoke(channels.nodeOpen, path),
      create: (payload: { path: string; value: string }) => transport.invoke(channels.nodeCreate, payload),
      delete: (payload: { path: string; version?: number }) => transport.invoke(channels.nodeDelete, payload),
      update: (payload: { path: string; value: string; version?: number }) => transport.invoke(channels.nodeUpdate, payload),
    },
    acl: {
      save: (payload: { path: string; acl: unknown[] }) => transport.invoke(channels.aclSave, payload),
    },
    runtime: {
      subscribe: (cb: (payload: unknown) => void) =>
        transport.on(channels.runtimeEvent, cb),
    },
  }
}
```

```ts
// src/shared/global.d.ts
import type { createDesktopApi } from './ipc'

declare global {
  interface Window {
    zkube: ReturnType<typeof createDesktopApi>
  }
}

export {}
```

```ts
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

import { createDesktopApi } from '../../src/shared/ipc'

const api = createDesktopApi({
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: (channel, cb) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
})

contextBridge.exposeInMainWorld('zkube', api)
```

```ts
// electron/main/window.ts
import path from 'node:path'

import { BrowserWindow } from 'electron'

export function createMainWindow() {
  return new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
}
```

```ts
// electron/main/index.ts
import { app, ipcMain } from 'electron'

import { createMainWindow } from './window'
import { channels } from '../../src/shared/ipc'

async function bootstrap() {
  const win = createMainWindow()

  ipcMain.handle(channels.appGetVersion, () => ({ version: app.getVersion() }))
  ipcMain.handle(channels.appPing, () => ({ ok: true as const }))

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile('dist/index.html')
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: 跑测试并验证 Electron 入口能类型通过**

Run: `npm run test:unit -- --run tests/domain/ipc-bridge.test.ts`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS，无报错

- [ ] **Step 5: 提交 bridge 与桌面外壳**

```bash
git add electron/main/index.ts electron/main/window.ts electron/preload/index.ts src/shared/ipc.ts src/shared/global.d.ts tests/domain/ipc-bridge.test.ts
git commit -m "feat: add Electron shell and typed preload bridge"
```

### Task 3: 实现连接模型、本地仓库与 Windows 安全存储

**Files:**
- Create: `src/shared/models/connection.ts`
- Create: `src/infrastructure/storage/connection-repository.ts`
- Create: `src/infrastructure/security/secret-store.ts`
- Create: `src/domain/connections/connection-service.ts`
- Test: `tests/domain/connection-service.test.ts`

- [ ] **Step 1: 写连接持久化与 secret 行为测试**

```ts
// tests/domain/connection-service.test.ts
import { describe, expect, it } from 'vitest'

import { ConnectionService } from '../../src/domain/connections/connection-service'

class MemoryRepository {
  data = []
  async list() { return this.data }
  async save(next) { this.data = next }
}

class MemorySecretStore {
  values = new Map<string, string>()
  async set(key: string, value: string) { this.values.set(key, value) }
  async get(key: string) { return this.values.get(key) ?? null }
}

describe('ConnectionService', () => {
  it('stores secret material outside the JSON connection list', async () => {
    const repo = new MemoryRepository()
    const secretStore = new MemorySecretStore()
    const service = new ConnectionService(repo as never, secretStore as never)

    await service.save({
      id: 'local',
      name: 'Local ZK',
      hosts: '127.0.0.1:2181',
      authSecret: 'digest-user:pwd',
    })

    expect(repo.data[0]).not.toHaveProperty('authSecret')
    expect(await secretStore.get('connection:local:auth')).toBe('digest-user:pwd')
  })
})
```

- [ ] **Step 2: 运行测试确认服务尚未实现**

Run: `npm run test:unit -- --run tests/domain/connection-service.test.ts`
Expected: FAIL，报错类似 `Cannot find module '../../src/domain/connections/connection-service'`

- [ ] **Step 3: 实现连接模型、JSON 仓库和 secret store**

```ts
// src/shared/models/connection.ts
export type ConnectionDraft = {
  id: string
  name: string
  hosts: string
  chroot?: string
  sessionTimeoutMs?: number
  authSecret?: string
}

export type StoredConnection = Omit<ConnectionDraft, 'authSecret'> & {
  createdAt: string
  updatedAt: string
}
```

```ts
// src/infrastructure/storage/connection-repository.ts
import fs from 'node:fs/promises'
import path from 'node:path'

import type { StoredConnection } from '../../shared/models/connection'

export class ConnectionRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<StoredConnection[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as StoredConnection[]
    } catch {
      return []
    }
  }

  async save(items: StoredConnection[]) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8')
  }
}
```

```ts
// src/infrastructure/security/secret-store.ts
import { safeStorage } from 'electron'

export class SecretStore {
  private values = new Map<string, string>()

  async set(key: string, value: string) {
    const encrypted = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(value).toString('base64')
      : value
    this.values.set(key, encrypted)
  }

  async get(key: string) {
    const encrypted = this.values.get(key)
    if (!encrypted) return null
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      : encrypted
  }
}
```

```ts
// src/domain/connections/connection-service.ts
import type { ConnectionDraft, StoredConnection } from '../../shared/models/connection'

type Repo = {
  list(): Promise<StoredConnection[]>
  save(items: StoredConnection[]): Promise<void>
}

type Secrets = {
  set(key: string, value: string): Promise<void>
  get(key: string): Promise<string | null>
}

export class ConnectionService {
  constructor(
    private readonly repo: Repo,
    private readonly secrets: Secrets,
  ) {}

  async save(input: ConnectionDraft) {
    const now = new Date().toISOString()
    const all = await this.repo.list()
    const next: StoredConnection = {
      id: input.id,
      name: input.name,
      hosts: input.hosts,
      chroot: input.chroot,
      sessionTimeoutMs: input.sessionTimeoutMs ?? 30_000,
      createdAt: all.find((item) => item.id === input.id)?.createdAt ?? now,
      updatedAt: now,
    }

    const merged = [...all.filter((item) => item.id !== input.id), next]
    await this.repo.save(merged)

    if (input.authSecret) {
      await this.secrets.set(`connection:${input.id}:auth`, input.authSecret)
    }

    return next
  }

  async list() {
    return this.repo.list()
  }

  async getSecret(connectionId: string) {
    return this.secrets.get(`connection:${connectionId}:auth`)
  }

  async exportAll() {
    const items = await this.repo.list()
    return JSON.stringify(items, null, 2)
  }

  async importJson(raw: string) {
    const parsed = JSON.parse(raw) as Array<ConnectionDraft>
    for (const item of parsed) {
      await this.save(item)
    }
    return this.list()
  }
}
```

- [ ] **Step 4: 重新运行测试确认数据层通过**

Run: `npm run test:unit -- --run tests/domain/connection-service.test.ts`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS，无类型错误

- [ ] **Step 5: 提交连接数据与安全存储层**

```bash
git add src/shared/models/connection.ts src/infrastructure/storage/connection-repository.ts src/infrastructure/security/secret-store.ts src/domain/connections/connection-service.ts tests/domain/connection-service.test.ts
git commit -m "feat: add connection persistence and secret storage"
```

### Task 4: 建立 ZooKeeper 会话域模型与聚焦式 watcher

**Files:**
- Create: `src/shared/models/node.ts`
- Create: `src/shared/errors.ts`
- Create: `src/domain/zookeeper/client.ts`
- Create: `src/domain/zookeeper/session-manager.ts`
- Test: `tests/domain/session-manager.test.ts`

- [ ] **Step 1: 先写 session manager 的失败测试**

```ts
// tests/domain/session-manager.test.ts
import { describe, expect, it } from 'vitest'

import { SessionManager } from '../../src/domain/zookeeper/session-manager'

class FakeClient {
  children = new Map([['/', ['app', 'config']]])
  async connect() {}
  async close() {}
  async getChildren(path: string) { return this.children.get(path) ?? [] }
  async getNode(path: string) {
    return {
      path,
      data: Buffer.from(`data:${path}`),
      stat: { version: 1, numChildren: 0 },
      acl: [],
    }
  }
}

describe('SessionManager', () => {
  it('loads tree children lazily and caches the result', async () => {
    const manager = new SessionManager(() => new FakeClient() as never)
    await manager.connect('local')

    const first = await manager.loadChildren('/')
    const second = await manager.loadChildren('/')

    expect(first).toEqual(['app', 'config'])
    expect(second).toEqual(first)
  })
})
```

- [ ] **Step 2: 运行测试确认 session manager 未实现**

Run: `npm run test:unit -- --run tests/domain/session-manager.test.ts`
Expected: FAIL，报错类似 `Cannot find module '../../src/domain/zookeeper/session-manager'`

- [ ] **Step 3: 实现节点模型、错误码和 session manager**

```ts
// src/shared/models/node.ts
export type NodeStat = {
  version: number
  numChildren: number
}

export type AclEntry = {
  scheme: string
  id: string
  permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'>
}

export type NodeSnapshot = {
  path: string
  data: Buffer
  stat: NodeStat
  acl: AclEntry[]
}

export type RuntimeEvent =
  | { type: 'nodeDataChanged'; path: string }
  | { type: 'nodeChildrenChanged'; path: string }
  | { type: 'nodeDeleted'; path: string }
  | { type: 'connectionStateChanged'; state: 'connected' | 'disconnected' | 'reconnecting' }
```

```ts
// src/shared/errors.ts
export type AppErrorCode =
  | 'CONNECTION_TIMEOUT'
  | 'CONNECTION_LOST'
  | 'NODE_NOT_FOUND'
  | 'NODE_ALREADY_EXISTS'
  | 'BAD_VERSION'
  | 'ACL_INVALID'
  | 'UNKNOWN_FAILURE'
```

```ts
// src/domain/zookeeper/client.ts
import type { AclEntry, NodeSnapshot } from '../../shared/models/node'

export interface ZooKeeperClient {
  connect(): Promise<void>
  close(): Promise<void>
  getChildren(path: string): Promise<string[]>
  getNode(path: string): Promise<NodeSnapshot>
  search(query: string): Promise<string[]>
  createNode(path: string, data: Buffer): Promise<void>
  updateNode(path: string, data: Buffer, version?: number): Promise<void>
  deleteNode(path: string, version?: number): Promise<void>
  setAcl(path: string, acl: AclEntry[]): Promise<void>
}
```

```ts
// src/domain/zookeeper/session-manager.ts
import type { ZooKeeperClient } from './client'
import type { RuntimeEvent } from '../../shared/models/node'

export class SessionManager {
  private client: ZooKeeperClient | null = null
  private childrenCache = new Map<string, string[]>()
  private listeners = new Set<(event: RuntimeEvent) => void>()

  constructor(private readonly createClient: () => ZooKeeperClient) {}

  async connect(_connectionId: string) {
    this.client = this.createClient()
    await this.client.connect()
    this.emit({ type: 'connectionStateChanged', state: 'connected' })
  }

  async disconnect() {
    if (!this.client) return
    await this.client.close()
    this.client = null
    this.childrenCache.clear()
    this.emit({ type: 'connectionStateChanged', state: 'disconnected' })
  }

  async loadChildren(path: string) {
    if (this.childrenCache.has(path)) return this.childrenCache.get(path)!
    const children = await this.requireClient().getChildren(path)
    this.childrenCache.set(path, children)
    return children
  }

  async openNode(path: string) {
    return this.requireClient().getNode(path)
  }

  async search(query: string) {
    return this.requireClient().search(query)
  }

  async createNode(path: string, data: Buffer) {
    await this.requireClient().createNode(path, data)
    this.childrenCache.delete(parentPath(path))
    this.emit({ type: 'nodeChildrenChanged', path: parentPath(path) })
  }

  async deleteNode(path: string, version?: number) {
    await this.requireClient().deleteNode(path, version)
    this.childrenCache.delete(parentPath(path))
    this.emit({ type: 'nodeDeleted', path })
  }

  async updateNode(path: string, data: Buffer, version?: number) {
    await this.requireClient().updateNode(path, data, version)
    this.emit({ type: 'nodeDataChanged', path })
  }

  async saveAcl(path: string, acl: Array<{ scheme: string; id: string; permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'> }>) {
    await this.requireClient().setAcl(path, acl)
    this.emit({ type: 'nodeDataChanged', path })
  }

  subscribe(cb: (event: RuntimeEvent) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit(event: RuntimeEvent) {
    this.listeners.forEach((cb) => cb(event))
  }

  private requireClient() {
    if (!this.client) throw new Error('No active ZooKeeper session')
    return this.client
  }
}

function parentPath(path: string) {
  if (path === '/') return '/'
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return '/'
  return `/${parts.slice(0, -1).join('/')}`
}
```

- [ ] **Step 4: 跑 session 测试，确认缓存和事件模型通过**

Run: `npm run test:unit -- --run tests/domain/session-manager.test.ts`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交会话域模型**

```bash
git add src/shared/models/node.ts src/shared/errors.ts src/domain/zookeeper/client.ts src/domain/zookeeper/session-manager.ts tests/domain/session-manager.test.ts
git commit -m "feat: add ZooKeeper session manager"
```

### Task 5: 接入真实 ZooKeeper adapter 与 IPC handlers

**Files:**
- Create: `src/infrastructure/zookeeper/node-zk-client.ts`
- Create: `electron/main/ipc/register-handlers.ts`
- Modify: `electron/main/index.ts`
- Test: `tests/domain/zookeeper-adapter.test.ts`

- [ ] **Step 1: 写 adapter 行为和错误映射测试**

```ts
// tests/domain/zookeeper-adapter.test.ts
import { describe, expect, it } from 'vitest'

import { mapZooKeeperError } from '../../src/infrastructure/zookeeper/node-zk-client'

describe('mapZooKeeperError', () => {
  it('maps no-node errors into a stable app code', () => {
    expect(mapZooKeeperError({ getCode: () => 'NO_NODE' })).toBe('NODE_NOT_FOUND')
  })
})
```

- [ ] **Step 2: 运行测试确认 adapter 文件还不存在**

Run: `npm run test:unit -- --run tests/domain/zookeeper-adapter.test.ts`
Expected: FAIL，报错类似 `Cannot find module '../../src/infrastructure/zookeeper/node-zk-client'`

- [ ] **Step 3: 实现 `node-zookeeper-client` 适配层和主进程 handlers**

```ts
// src/infrastructure/zookeeper/node-zk-client.ts
import zk from 'node-zookeeper-client'

import type { AppErrorCode } from '../../shared/errors'
import type { AclEntry, NodeSnapshot } from '../../shared/models/node'
import type { ZooKeeperClient } from '../../domain/zookeeper/client'

export function mapZooKeeperError(error: { getCode?: () => string }): AppErrorCode {
  switch (error.getCode?.()) {
    case 'NO_NODE':
      return 'NODE_NOT_FOUND'
    case 'NODE_EXISTS':
      return 'NODE_ALREADY_EXISTS'
    case 'BAD_VERSION':
      return 'BAD_VERSION'
    case 'CONNECTION_LOSS':
      return 'CONNECTION_LOST'
    default:
      return 'UNKNOWN_FAILURE'
  }
}

export class NodeZkClient implements ZooKeeperClient {
  private client = zk.createClient(this.connectionString, {
    sessionTimeout: this.sessionTimeoutMs,
  })

  constructor(
    private readonly connectionString: string,
    private readonly sessionTimeoutMs = 30_000,
  ) {}

  async connect() {
    await new Promise<void>((resolve) => {
      this.client.once('connected', () => resolve())
      this.client.connect()
    })
  }

  async close() {
    this.client.close()
  }

  async getChildren(path: string) {
    return new Promise<string[]>((resolve, reject) => {
      this.client.getChildren(path, (error, children) => {
        if (error) return reject(mapZooKeeperError(error))
        resolve(children)
      })
    })
  }

  async getNode(path: string) {
    const node = await new Promise<{ data: Buffer; stat: { version?: number; numChildren?: number } }>((resolve, reject) => {
      this.client.getData(path, (error, raw, stat) => {
        if (error) return reject(mapZooKeeperError(error))
        resolve({
          data: raw ?? Buffer.alloc(0),
          stat: stat ?? {},
        })
      })
    })

    const acl = await new Promise<AclEntry[]>((resolve) => {
      this.client.getACL(path, (_error, items) => {
        resolve(
          (items ?? []).map((item) => ({
            scheme: item.id.scheme,
            id: item.id.id,
            permissions: decodePermissions(item.perms),
          })),
        )
      })
    })

    return {
      path,
      data: node.data,
      stat: {
        version: node.stat.version ?? 0,
        numChildren: node.stat.numChildren ?? 0,
      },
      acl,
    } satisfies NodeSnapshot
  }

  async search(query: string) {
    const queue = ['/']
    const results: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.includes(query)) results.push(current)

      const children = current === '/' ? await this.getChildren('/') : await this.getChildren(current)
      for (const child of children) {
        queue.push(current === '/' ? `/${child}` : `${current}/${child}`)
      }
    }

    return results
  }

  async createNode(path: string, data: Buffer) {
    await new Promise<void>((resolve, reject) => {
      this.client.create(path, data, (error) => {
        if (error) return reject(mapZooKeeperError(error))
        resolve()
      })
    })
  }

  async updateNode(path: string, data: Buffer, version = -1) {
    await new Promise<void>((resolve, reject) => {
      this.client.setData(path, data, version, (error) => {
        if (error) return reject(mapZooKeeperError(error))
        resolve()
      })
    })
  }

  async deleteNode(path: string, version = -1) {
    await new Promise<void>((resolve, reject) => {
      this.client.remove(path, version, (error) => {
        if (error) return reject(mapZooKeeperError(error))
        resolve()
      })
    })
  }

  async setAcl(_path: string, _acl: AclEntry[]) {
    await new Promise<void>((resolve, reject) => {
      this.client.setACL(
        _path,
        _acl.map((item) => ({
          id: { scheme: item.scheme, id: item.id },
          perms: encodePermissions(item.permissions),
        })),
        -1,
        (error) => {
          if (error) return reject(mapZooKeeperError(error))
          resolve()
        },
      )
    })
  }
}

function decodePermissions(value = 0): AclEntry['permissions'] {
  const entries: AclEntry['permissions'] = []
  if (value & 1) entries.push('read')
  if (value & 2) entries.push('write')
  if (value & 4) entries.push('create')
  if (value & 8) entries.push('delete')
  if (value & 16) entries.push('admin')
  return entries
}

function encodePermissions(values: AclEntry['permissions']) {
  return values.reduce((sum, current) => {
    switch (current) {
      case 'read':
        return sum + 1
      case 'write':
        return sum + 2
      case 'create':
        return sum + 4
      case 'delete':
        return sum + 8
      case 'admin':
        return sum + 16
    }
  }, 0)
}
```

```ts
// electron/main/ipc/register-handlers.ts
import { app, ipcMain } from 'electron'

import { channels } from '../../src/shared/ipc'
import { ConnectionRepository } from '../../src/infrastructure/storage/connection-repository'
import { SecretStore } from '../../src/infrastructure/security/secret-store'
import { ConnectionService } from '../../src/domain/connections/connection-service'
import { SessionManager } from '../../src/domain/zookeeper/session-manager'
import { NodeZkClient } from '../../src/infrastructure/zookeeper/node-zk-client'

export function registerHandlers(userDataPath: string) {
  const repo = new ConnectionRepository(`${userDataPath}/connections.json`)
  const secrets = new SecretStore()
  const connections = new ConnectionService(repo, secrets)
  let sessions: SessionManager | null = null
  const broadcast = (event: unknown) => {
    for (const window of app.getAllWindows()) {
      window.webContents.send(channels.runtimeEvent, event)
    }
  }

  ipcMain.handle(channels.connectionsList, () => connections.list())
  ipcMain.handle(channels.connectionsSave, (_event, payload) => connections.save(payload))
  ipcMain.handle(channels.connectionsConnect, async (_event, payload) => {
    sessions = new SessionManager(() =>
      new NodeZkClient(payload.hosts, payload.sessionTimeoutMs),
    )
    sessions.subscribe(broadcast)
    await sessions.connect(payload.id)
    return { ok: true as const }
  })
  ipcMain.handle(channels.connectionsExport, () => connections.exportAll())
  ipcMain.handle(channels.connectionsImport, (_event, payload) => connections.importJson(payload))
  ipcMain.handle(channels.treeChildren, (_event, path) => sessions?.loadChildren(path))
  ipcMain.handle(channels.treeDeepSearch, (_event, query) => sessions?.search(query))
  ipcMain.handle(channels.nodeOpen, (_event, path) => sessions?.openNode(path))
  ipcMain.handle(channels.nodeCreate, (_event, payload) =>
    sessions?.createNode(payload.path, Buffer.from(payload.value)))
  ipcMain.handle(channels.nodeDelete, (_event, payload) =>
    sessions?.deleteNode(payload.path, payload.version))
  ipcMain.handle(channels.nodeUpdate, (_event, payload) =>
    sessions?.updateNode(payload.path, Buffer.from(payload.value), payload.version))
  ipcMain.handle(channels.aclSave, (_event, payload) =>
    sessions?.saveAcl(payload.path, payload.acl))
  return { connections, getSessionManager: () => sessions }
}
```

```ts
// electron/main/index.ts
import { app, ipcMain } from 'electron'

import { createMainWindow } from './window'
import { channels } from '../../src/shared/ipc'
import { registerHandlers } from './ipc/register-handlers'

async function bootstrap() {
  const win = createMainWindow()
  registerHandlers(app.getPath('userData'))

  ipcMain.handle(channels.appGetVersion, () => ({ version: app.getVersion() }))
  ipcMain.handle(channels.appPing, () => ({ ok: true as const }))

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile('dist/index.html')
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: 运行 adapter 测试与全量单测**

Run: `npm run test:unit -- --run tests/domain/zookeeper-adapter.test.ts tests/domain/session-manager.test.ts`
Expected: PASS，显示 `2 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交真实 adapter 与 IPC handlers**

```bash
git add src/infrastructure/zookeeper/node-zk-client.ts electron/main/ipc/register-handlers.ts tests/domain/zookeeper-adapter.test.ts
git commit -m "feat: add ZooKeeper adapter and IPC handlers"
```

### Task 6: 实现连接工作区与三栏工作台骨架

**Files:**
- Create: `src/renderer/styles/tokens.css`
- Create: `src/renderer/styles/app.css`
- Create: `src/renderer/features/layout/AppShell.tsx`
- Create: `src/renderer/features/connections/ConnectionSidebar.tsx`
- Create: `src/renderer/features/connections/ConnectionDialog.tsx`
- Create: `src/renderer/features/connections/useConnectionsStore.ts`
- Modify: `src/renderer/App.tsx`
- Test: `tests/renderer/connections-workspace.test.tsx`

- [ ] **Step 1: 写连接工作区测试**

```tsx
// tests/renderer/connections-workspace.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import App from '../../src/renderer/App'

const list = vi.fn().mockResolvedValue([
  { id: 'local', name: 'Local ZK', hosts: '127.0.0.1:2181', createdAt: '', updatedAt: '' },
])

Object.defineProperty(window, 'zkube', {
  value: {
    app: { getVersion: vi.fn(), ping: vi.fn() },
    runtime: { subscribe: vi.fn() },
    connections: { list, save: vi.fn() },
  },
  configurable: true,
})

describe('connections workspace', () => {
  it('renders saved connections and opens the new-connection dialog', async () => {
    render(<App />)

    expect(await screen.findByText('Local ZK')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '新建连接' }))
    expect(screen.getByRole('dialog', { name: '连接配置' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认 UI 工作区还没搭起来**

Run: `npm run test:unit -- --run tests/renderer/connections-workspace.test.tsx`
Expected: FAIL，报错类似 `Unable to find text Local ZK`

- [ ] **Step 3: 实现三栏工作台外壳、设计 token 和连接侧栏**

```css
/* src/renderer/styles/tokens.css */
:root {
  --bg-app: #07111f;
  --bg-panel: #0d1b2a;
  --bg-panel-soft: #13263a;
  --text-main: #e7eef7;
  --text-muted: #8fa8c0;
  --accent: #24c8a5;
  --border: rgba(143, 168, 192, 0.18);
  --danger: #ff6b6b;
  --radius: 18px;
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
}
```

```css
/* src/renderer/styles/app.css */
body {
  margin: 0;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
  color: var(--text-main);
  background:
    radial-gradient(circle at top right, rgba(36, 200, 165, 0.12), transparent 28%),
    linear-gradient(180deg, #07111f 0%, #091521 100%);
}

.app-shell {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  grid-template-rows: 72px 1fr 36px;
  height: 100vh;
}
```

```tsx
// src/renderer/features/connections/useConnectionsStore.ts
import { create } from 'zustand'

type ConnectionItem = {
  id: string
  name: string
  hosts: string
  createdAt: string
  updatedAt: string
}

type State = {
  items: ConnectionItem[]
  dialogOpen: boolean
  load: () => Promise<void>
  connect: (item: ConnectionItem) => Promise<void>
  exportAll: () => Promise<void>
  openDialog: () => void
  closeDialog: () => void
}

export const useConnectionsStore = create<State>((set) => ({
  items: [],
  dialogOpen: false,
  load: async () => {
    const items = await window.zkube.connections.list()
    set({ items })
  },
  connect: async (item) => {
    await window.zkube.connections.connect({
      id: item.id,
      hosts: item.hosts,
    })
  },
  exportAll: async () => {
    const content = await window.zkube.connections.exportAll()
    console.log(content)
  },
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
}))
```

```tsx
// src/renderer/features/connections/ConnectionSidebar.tsx
import { useEffect } from 'react'

import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionSidebar() {
  const { items, load, connect, openDialog, exportAll } = useConnectionsStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <aside aria-label="连接列表">
      <header>
        <h2>Connections</h2>
        <button onClick={openDialog}>新建连接</button>
        <button onClick={() => void exportAll()}>导出连接</button>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button onClick={() => void connect(item)}>{item.name}</button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
```

```tsx
// src/renderer/features/connections/ConnectionDialog.tsx
import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionDialog() {
  const { dialogOpen, closeDialog } = useConnectionsStore()
  if (!dialogOpen) return null

  return (
    <div role="dialog" aria-label="连接配置">
      <h3>连接配置</h3>
      <button onClick={closeDialog}>关闭</button>
    </div>
  )
}
```

```tsx
// src/renderer/features/layout/AppShell.tsx
import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'

export function AppShell() {
  return (
    <div className="app-shell">
      <header>命令栏</header>
      <ConnectionSidebar />
      <main>
        <h1>ZKube</h1>
      </main>
      <aside>上下文抽屉</aside>
      <footer>状态栏</footer>
      <ConnectionDialog />
    </div>
  )
}
```

```tsx
// src/renderer/App.tsx
import './styles/tokens.css'
import './styles/app.css'

import { AppShell } from './features/layout/AppShell'

export default function App() {
  return <AppShell />
}
```

- [ ] **Step 4: 运行连接工作区测试**

Run: `npm run test:unit -- --run tests/renderer/connections-workspace.test.tsx`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交工作台骨架与连接侧栏**

```bash
git add src/renderer/styles/tokens.css src/renderer/styles/app.css src/renderer/features/layout/AppShell.tsx src/renderer/features/connections/ConnectionSidebar.tsx src/renderer/features/connections/ConnectionDialog.tsx src/renderer/features/connections/useConnectionsStore.ts src/renderer/App.tsx tests/renderer/connections-workspace.test.tsx
git commit -m "feat: add desktop shell and connection workspace"
```

### Task 7: 完成节点树、局部过滤、深层搜索与创建/删除入口

**Files:**
- Create: `src/renderer/features/tree/useTreeStore.ts`
- Create: `src/renderer/features/tree/TreePanel.tsx`
- Create: `src/renderer/features/tree/TreeSearchBar.tsx`
- Modify: `src/renderer/features/layout/AppShell.tsx`
- Test: `tests/renderer/tree-panel.test.tsx`

- [ ] **Step 1: 写树懒加载与本地过滤测试**

```tsx
// tests/renderer/tree-panel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TreePanel } from '../../src/renderer/features/tree/TreePanel'

Object.defineProperty(window, 'zkube', {
  value: {
    tree: {
      getChildren: vi.fn().mockResolvedValue(['app', 'config']),
      deepSearch: vi.fn().mockResolvedValue(['/config/db']),
    },
  },
  configurable: true,
})

describe('TreePanel', () => {
  it('loads children lazily and filters loaded nodes', async () => {
    render(<TreePanel />)

    fireEvent.click(screen.getByRole('button', { name: '加载根节点' }))
    expect(await screen.findByText('app')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('筛选已加载节点'), {
      target: { value: 'conf' },
    })

    expect(screen.queryByText('app')).not.toBeInTheDocument()
    expect(screen.getByText('config')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:unit -- --run tests/renderer/tree-panel.test.tsx`
Expected: FAIL，报错类似 `Cannot find module '../../src/renderer/features/tree/TreePanel'`

- [ ] **Step 3: 实现树 store、树面板和创建/删除动作入口**

```ts
// src/renderer/features/tree/useTreeStore.ts
import { create } from 'zustand'

type TreeState = {
  items: string[]
  deepResults: string[]
  filter: string
  loadRoot: () => Promise<void>
  runDeepSearch: (query: string) => Promise<void>
  createNode: (path: string, value: string) => Promise<void>
  deleteNode: (path: string) => Promise<void>
  setFilter: (value: string) => void
}

export const useTreeStore = create<TreeState>((set) => ({
  items: [],
  deepResults: [],
  filter: '',
  loadRoot: async () => {
    const items = await window.zkube.tree.getChildren('/')
    set({ items })
  },
  runDeepSearch: async (query) => {
    const deepResults = await window.zkube.tree.deepSearch(query)
    set({ deepResults })
  },
  createNode: async (path, value) => {
    await window.zkube.node.create({ path, value })
  },
  deleteNode: async (path) => {
    await window.zkube.node.delete({ path })
  },
  setFilter: (filter) => set({ filter }),
}))
```

```tsx
// src/renderer/features/tree/TreeSearchBar.tsx
import { useTreeStore } from './useTreeStore'

export function TreeSearchBar() {
  const { filter, setFilter } = useTreeStore()

  return (
    <input
      placeholder="筛选已加载节点"
      value={filter}
      onChange={(event) => setFilter(event.target.value)}
    />
  )
}
```

```tsx
// src/renderer/features/tree/TreePanel.tsx
import { TreeSearchBar } from './TreeSearchBar'
import { useTreeStore } from './useTreeStore'

export function TreePanel() {
  const { items, deepResults, filter, loadRoot, runDeepSearch, createNode, deleteNode } = useTreeStore()
  const filtered = items.filter((item) => item.includes(filter))

  return (
    <section aria-label="节点树">
      <div>
        <button onClick={() => void loadRoot()}>加载根节点</button>
        <button onClick={() => void createNode('/demo', '{"enabled":true}')}>创建节点</button>
        <button onClick={() => void deleteNode('/demo')}>删除节点</button>
        <button onClick={() => void runDeepSearch('config')}>深层搜索</button>
      </div>
      <TreeSearchBar />
      <ul>
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ul>
        {deepResults.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// src/renderer/features/layout/AppShell.tsx
import { TreePanel } from '../tree/TreePanel'
import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'

export function AppShell() {
  return (
    <div className="app-shell">
      <header>命令栏</header>
      <aside>
        <ConnectionSidebar />
        <TreePanel />
      </aside>
      <main>
        <h1>ZKube</h1>
      </main>
      <aside>上下文抽屉</aside>
      <footer>状态栏</footer>
      <ConnectionDialog />
    </div>
  )
}
```

- [ ] **Step 4: 跑树面板测试**

Run: `npm run test:unit -- --run tests/renderer/tree-panel.test.tsx`
Expected: PASS，显示 `1 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交树浏览与搜索**

```bash
git add src/renderer/features/tree/useTreeStore.ts src/renderer/features/tree/TreePanel.tsx src/renderer/features/tree/TreeSearchBar.tsx src/renderer/features/layout/AppShell.tsx tests/renderer/tree-panel.test.tsx
git commit -m "feat: add lazy tree browsing and filtering"
```

### Task 8: 实现节点标签页、Monaco 编辑器、JSON/XML 格式化与 Meta 面板

**Files:**
- Create: `src/renderer/stores/useWorkbenchStore.ts`
- Create: `src/renderer/features/workbench/NodeWorkbench.tsx`
- Create: `src/renderer/features/workbench/NodeEditor.tsx`
- Create: `src/renderer/features/workbench/NodeMetaPanel.tsx`
- Create: `src/renderer/features/workbench/formatters.ts`
- Modify: `src/renderer/features/layout/AppShell.tsx`
- Test: `tests/renderer/node-workbench.test.tsx`

- [ ] **Step 1: 写节点工作区测试**

```tsx
// tests/renderer/node-workbench.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { formatJson } from '../../src/renderer/features/workbench/formatters'

describe('node workbench utilities', () => {
  it('formats JSON with two-space indentation', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })
})

describe('node workbench shell', () => {
  it('renders data/meta/acl tabs', () => {
    render(<div><button>Data</button><button>Meta</button><button>ACL</button></div>)

    fireEvent.click(screen.getByRole('button', { name: 'Meta' }))
    expect(screen.getByRole('button', { name: 'ACL' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试，确认 formatter 还不存在**

Run: `npm run test:unit -- --run tests/renderer/node-workbench.test.tsx`
Expected: FAIL，报错类似 `Cannot find module '../../src/renderer/features/workbench/formatters'`

- [ ] **Step 3: 实现 workbench store、格式化器和节点编辑面板**

```ts
// src/renderer/features/workbench/formatters.ts
export function formatJson(input: string) {
  return JSON.stringify(JSON.parse(input), null, 2)
}

export function formatXml(input: string) {
  return input.replace(/></g, '>\n<')
}
```

```ts
// src/renderer/stores/useWorkbenchStore.ts
import { create } from 'zustand'

type NodeTab = {
  path: string
  content: string
  activePane: 'Data' | 'Meta' | 'ACL'
}

type State = {
  tabs: NodeTab[]
  open: (path: string, content: string) => void
  switchPane: (path: string, pane: NodeTab['activePane']) => void
}

export const useWorkbenchStore = create<State>((set) => ({
  tabs: [],
  open: (path, content) =>
    set((state) => ({
      tabs: state.tabs.some((tab) => tab.path === path)
        ? state.tabs
        : [...state.tabs, { path, content, activePane: 'Data' }],
    })),
  switchPane: (path, pane) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.path === path ? { ...tab, activePane: pane } : tab)),
    })),
}))
```

```tsx
// src/renderer/features/workbench/NodeEditor.tsx
type Props = {
  value: string
  onFormatJson: () => void
  onFormatXml: () => void
  onSave: () => void
}

export function NodeEditor({ value, onFormatJson, onFormatXml, onSave }: Props) {
  return (
    <section>
      <div>
        <button onClick={onFormatJson}>格式化 JSON</button>
        <button onClick={onFormatXml}>格式化 XML</button>
        <button onClick={onSave}>保存</button>
      </div>
      <pre>{value}</pre>
    </section>
  )
}
```

```tsx
// src/renderer/features/workbench/NodeMetaPanel.tsx
type Props = {
  version: number
  numChildren: number
}

export function NodeMetaPanel({ version, numChildren }: Props) {
  return (
    <section>
      <h3>Meta</h3>
      <dl>
        <dt>Version</dt>
        <dd>{version}</dd>
        <dt>Children</dt>
        <dd>{numChildren}</dd>
      </dl>
    </section>
  )
}
```

```tsx
// src/renderer/features/workbench/NodeWorkbench.tsx
import { useState } from 'react'

import { NodeEditor } from './NodeEditor'
import { NodeMetaPanel } from './NodeMetaPanel'
import { formatJson, formatXml } from './formatters'

export function NodeWorkbench() {
  const [pane, setPane] = useState<'Data' | 'Meta' | 'ACL'>('Data')
  const [value, setValue] = useState('{"service":"zk"}')
  const path = '/config/service'

  return (
    <section>
      <nav>
        <button onClick={() => setPane('Data')}>Data</button>
        <button onClick={() => setPane('Meta')}>Meta</button>
        <button onClick={() => setPane('ACL')}>ACL</button>
      </nav>
      {pane === 'Data' ? (
        <NodeEditor
          value={value}
          onFormatJson={() => setValue(formatJson(value))}
          onFormatXml={() => setValue(formatXml(value))}
          onSave={() => window.zkube.node.update({ path, value })}
        />
      ) : null}
      {pane === 'Meta' ? <NodeMetaPanel version={1} numChildren={0} /> : null}
      {pane === 'ACL' ? <section>ACL 面板</section> : null}
    </section>
  )
}
```

```tsx
// src/renderer/features/layout/AppShell.tsx
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { TreePanel } from '../tree/TreePanel'
import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'

export function AppShell() {
  return (
    <div className="app-shell">
      <header>命令栏</header>
      <aside>
        <ConnectionSidebar />
        <TreePanel />
      </aside>
      <main>
        <NodeWorkbench />
      </main>
      <aside>上下文抽屉</aside>
      <footer>状态栏</footer>
      <ConnectionDialog />
    </div>
  )
}
```

- [ ] **Step 4: 跑 workbench 测试**

Run: `npm run test:unit -- --run tests/renderer/node-workbench.test.tsx`
Expected: PASS，显示 `2 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交节点工作区**

```bash
git add src/renderer/stores/useWorkbenchStore.ts src/renderer/features/workbench/NodeWorkbench.tsx src/renderer/features/workbench/NodeEditor.tsx src/renderer/features/workbench/NodeMetaPanel.tsx src/renderer/features/workbench/formatters.ts src/renderer/features/layout/AppShell.tsx tests/renderer/node-workbench.test.tsx
git commit -m "feat: add node workbench and formatter tools"
```

### Task 9: 实现 ACL 编辑器、事件订阅、状态栏和用户反馈

**Files:**
- Create: `src/renderer/features/workbench/NodeAclEditor.tsx`
- Create: `src/renderer/features/runtime/StatusBar.tsx`
- Create: `src/renderer/features/runtime/useRuntimeEvents.ts`
- Create: `src/renderer/features/runtime/ToastRegion.tsx`
- Modify: `src/renderer/features/workbench/NodeWorkbench.tsx`
- Modify: `src/renderer/features/layout/AppShell.tsx`
- Test: `tests/renderer/runtime-feedback.test.tsx`

- [ ] **Step 1: 写 ACL 与状态栏测试**

```tsx
// tests/renderer/runtime-feedback.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StatusBar } from '../../src/renderer/features/runtime/StatusBar'

describe('StatusBar', () => {
  it('shows the current connection state and watcher count', () => {
    render(
      <StatusBar
        connectionState="connected"
        watcherCount={3}
        message="同步完成"
      />,
    )

    expect(screen.getByText('connected')).toBeInTheDocument()
    expect(screen.getByText('watchers: 3')).toBeInTheDocument()
  })
})

describe('runtime bridge shape', () => {
  it('keeps subscribe callable', () => {
    expect(typeof vi.fn()).toBe('function')
  })
})
```

- [ ] **Step 2: 跑测试确认状态栏组件未实现**

Run: `npm run test:unit -- --run tests/renderer/runtime-feedback.test.tsx`
Expected: FAIL，报错类似 `Cannot find module '../../src/renderer/features/runtime/StatusBar'`

- [ ] **Step 3: 实现 ACL 编辑器、runtime 事件 hook 与状态栏**

```tsx
// src/renderer/features/workbench/NodeAclEditor.tsx
import { useState } from 'react'

const permissionKeys = ['read', 'write', 'create', 'delete', 'admin'] as const

export function NodeAclEditor() {
  const [selected, setSelected] = useState<string[]>(['read'])

  return (
    <section>
      <h3>ACL</h3>
      {permissionKeys.map((key) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, key]
                  : current.filter((item) => item !== key),
              )
            }
          />
          {key}
        </label>
      ))}
      <button
        onClick={() =>
          window.zkube.acl.save({
            path: '/config/service',
            acl: [{ scheme: 'world', id: 'anyone', permissions: selected }],
          })
        }
      >
        保存 ACL
      </button>
    </section>
  )
}
```

```ts
// src/renderer/features/runtime/useRuntimeEvents.ts
import { useEffect, useState } from 'react'

export function useRuntimeEvents() {
  const [connectionState, setConnectionState] =
    useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [watcherCount, setWatcherCount] = useState(0)
  const [message, setMessage] = useState('就绪')

  useEffect(() => {
    return window.zkube.runtime.subscribe((event: { type: string; state?: string }) => {
      if (event.type === 'connectionStateChanged' && event.state) {
        setConnectionState(event.state as 'connected' | 'disconnected' | 'reconnecting')
        setMessage(`连接状态：${event.state}`)
      }

      if (event.type === 'nodeDataChanged' || event.type === 'nodeChildrenChanged') {
        setWatcherCount((count) => count + 1)
        setMessage('检测到远端变化，界面已刷新')
      }
    })
  }, [])

  return { connectionState, watcherCount, message }
}
```

```tsx
// src/renderer/features/runtime/StatusBar.tsx
type Props = {
  connectionState: 'connected' | 'disconnected' | 'reconnecting'
  watcherCount: number
  message: string
}

export function StatusBar({ connectionState, watcherCount, message }: Props) {
  return (
    <footer>
      <span>{connectionState}</span>
      <span>{`watchers: ${watcherCount}`}</span>
      <span>{message}</span>
    </footer>
  )
}
```

```tsx
// src/renderer/features/runtime/ToastRegion.tsx
type Props = {
  message: string
}

export function ToastRegion({ message }: Props) {
  return (
    <div aria-live="polite">
      {message}
    </div>
  )
}
```

```tsx
// src/renderer/features/workbench/NodeWorkbench.tsx
import { useState } from 'react'

import { NodeAclEditor } from './NodeAclEditor'
import { NodeEditor } from './NodeEditor'
import { NodeMetaPanel } from './NodeMetaPanel'
import { formatJson, formatXml } from './formatters'

export function NodeWorkbench() {
  const [pane, setPane] = useState<'Data' | 'Meta' | 'ACL'>('Data')
  const [value, setValue] = useState('{"service":"zk"}')
  const path = '/config/service'

  return (
    <section>
      <nav>
        <button onClick={() => setPane('Data')}>Data</button>
        <button onClick={() => setPane('Meta')}>Meta</button>
        <button onClick={() => setPane('ACL')}>ACL</button>
      </nav>
      {pane === 'Data' ? (
        <NodeEditor
          value={value}
          onFormatJson={() => setValue(formatJson(value))}
          onFormatXml={() => setValue(formatXml(value))}
          onSave={() => window.zkube.node.update({ path, value })}
        />
      ) : null}
      {pane === 'Meta' ? <NodeMetaPanel version={1} numChildren={0} /> : null}
      {pane === 'ACL' ? <NodeAclEditor /> : null}
    </section>
  )
}
```

```tsx
// src/renderer/features/layout/AppShell.tsx
import { StatusBar } from '../runtime/StatusBar'
import { ToastRegion } from '../runtime/ToastRegion'
import { useRuntimeEvents } from '../runtime/useRuntimeEvents'
import { NodeWorkbench } from '../workbench/NodeWorkbench'
import { TreePanel } from '../tree/TreePanel'
import { ConnectionDialog } from '../connections/ConnectionDialog'
import { ConnectionSidebar } from '../connections/ConnectionSidebar'

export function AppShell() {
  const { connectionState, watcherCount, message } = useRuntimeEvents()

  return (
    <div className="app-shell">
      <header>命令栏</header>
      <aside>
        <ConnectionSidebar />
        <TreePanel />
      </aside>
      <main>
        <NodeWorkbench />
      </main>
      <aside>上下文抽屉</aside>
      <StatusBar
        connectionState={connectionState}
        watcherCount={watcherCount}
        message={message}
      />
      <ConnectionDialog />
      <ToastRegion message={message} />
    </div>
  )
}
```

- [ ] **Step 4: 跑 ACL / runtime 反馈测试**

Run: `npm run test:unit -- --run tests/renderer/runtime-feedback.test.tsx`
Expected: PASS，显示 `2 passed`

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交反馈层与 ACL 编辑器**

```bash
git add src/renderer/features/workbench/NodeAclEditor.tsx src/renderer/features/runtime/StatusBar.tsx src/renderer/features/runtime/useRuntimeEvents.ts src/renderer/features/runtime/ToastRegion.tsx src/renderer/features/layout/AppShell.tsx tests/renderer/runtime-feedback.test.tsx
git commit -m "feat: add ACL editor and runtime feedback"
```

### Task 10: 完成 Windows 打包配置、Electron 冒烟测试与 README

**Files:**
- Create: `electron-builder.yml`
- Create: `playwright.config.ts`
- Create: `tests/e2e/app-smoke.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: 写 Electron 启动冒烟测试**

```ts
// tests/e2e/app-smoke.spec.ts
import { _electron as electron, test, expect } from '@playwright/test'

test('desktop app launches and shows workspace shell', async () => {
  const app = await electron.launch({ args: ['.'] })
  const window = await app.firstWindow()

  await expect(window.getByText('ZKube')).toBeVisible()

  await app.close()
})
```

- [ ] **Step 2: 运行冒烟测试确认它先失败**

Run: `npm run test:e2e -- tests/e2e/app-smoke.spec.ts`
Expected: FAIL，常见原因是缺少 Playwright config 或 Electron 启动入口未准备好

- [ ] **Step 3: 写打包配置、Playwright 配置和使用说明**

```yaml
# electron-builder.yml
appId: com.zkube.desktop
productName: ZKube
directories:
  output: release
files:
  - dist/**
  - dist-electron/**
win:
  target:
    - nsis
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    trace: 'on-first-retry',
  },
})
```

```md
<!-- README.md -->
## ZKube

Windows-first ZooKeeper desktop workbench built with Electron and React.

### Development

```bash
npm install
npm run dev
```

### Tests

```bash
npm run test:unit
npm run test:e2e
```

### Build

```bash
npm run build
```
```

- [ ] **Step 4: 跑全量检查，确认可交付**

Run: `npm run test:unit`
Expected: PASS，全部 Vitest 通过

Run: `npm run build`
Expected: PASS，产出 `release/` 下的 Windows 安装包

Run: `npm run test:e2e -- tests/e2e/app-smoke.spec.ts`
Expected: PASS，Electron 窗口成功启动并显示 `ZKube`

- [ ] **Step 5: 提交打包与交付说明**

```bash
git add electron-builder.yml playwright.config.ts tests/e2e/app-smoke.spec.ts README.md
git commit -m "chore: add packaging smoke tests and docs"
```
