# ZKube

ZKube is a Windows-first desktop visualization tool for ZooKeeper, built with Electron, React, and TypeScript.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Current Capabilities

- Connection management: create, save, and import connection profiles
- Tree browsing: load root nodes, expand on demand, filter locally, and run deep search
- Node workbench: open nodes directly from the tree or search results
- Node editing: edit text content, format JSON/XML, and save changes
- ACL panel: inspect and edit the `world:anyone` record
- Runtime feedback: status bar, toast-style feedback, and safer workbench reset on connection switches
- Windows packaging: build an installer with a basic Electron smoke test

## Tech Stack

- Electron 42
- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor
- Playwright
- Vitest
- `node-zookeeper-client`

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run test:unit
npm run typecheck
npm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

## Build

```bash
npm run build
```

Successful Windows build artifacts are generated under `release/`.

## Repository Layout

- `electron/`
  Electron main process and preload bridge
- `src/domain/`
  Connection and ZooKeeper session domain logic
- `src/infrastructure/`
  Local storage, secure storage, and ZooKeeper adapters
- `src/renderer/`
  React desktop workbench UI
- `tests/domain/`
  Domain-layer tests
- `tests/renderer/`
  Renderer/UI tests
- `tests/e2e/`
  Electron smoke tests

## Notes

- The current delivery target is Windows-first.
- Before connecting to a real ZooKeeper cluster, confirm the target environment and permissions.
- Validate risky operations in a non-production environment first whenever possible.
