# ZKube

ZKube is a Windows-first desktop workbench for Apache ZooKeeper, built with Electron, React, and TypeScript.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Overview

ZKube focuses on the everyday workflows that usually make ZooKeeper administration awkward in generic desktop tools:

- managing multiple connection profiles
- browsing large node trees with lazy loading
- opening nodes into a dedicated workbench
- editing node payloads with formatting helpers
- inspecting and updating selected ACL data
- packaging the tool as a desktop application for Windows

The current release direction is Windows-first, with core desktop workflows already in place and additional hardening still evolving.

## Project Status

ZKube is under active development.

What is already implemented:

- connection creation, persistence, and JSON import
- root loading, tree expansion, local filtering, and deep search
- node workbench tabs opened from the tree or search results
- node editing, JSON/XML formatting, and save flows
- `world:anyone` ACL inspection and editing
- runtime feedback, connection-state handling, and packaging smoke tests

What is intentionally still limited:

- Windows is the primary supported target today
- ACL editing is currently scoped to the `world:anyone` record
- advanced production features such as SSH tunneling and richer import validation are not finished yet

## Features

### Connection Management

- Create and save connection profiles locally
- Import connection profiles from JSON
- Persist secrets through Electron `safeStorage`-backed storage

### Tree Browsing

- Load root nodes on demand
- Expand child paths lazily
- Filter already-loaded paths locally
- Run deep search against the active ZooKeeper session

### Node Workbench

- Open nodes directly from the tree or search results
- Work with multiple tabs
- Format JSON and XML payloads before saving
- Isolate workbench state across connection switches

### Desktop Runtime

- Typed Electron preload bridge
- Renderer/runtime feedback through status bar and toast-style notifications
- Windows packaging with `electron-builder`
- Electron smoke coverage through Playwright

## Tech Stack

- Electron 42
- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor
- Vitest
- Playwright
- `node-zookeeper-client`

## Getting Started

### Prerequisites

- Node.js 20+ is recommended
- npm is used as the package manager in this repository

### Install Dependencies

```bash
npm install
```

### Start the App in Development

```bash
npm run dev
```

### Start the Full Electron App in Development

```bash
npm run dev:electron
```

## Validation

Unit tests:

```bash
npm run test:unit
```

Type checking:

```bash
npm run typecheck
```

Electron smoke test:

```bash
npm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

## Packaging

Build the renderer, Electron bundles, and Windows installer:

```bash
npm run build
```

Build artifacts are generated under `release/`.

## Working with Real ZooKeeper Clusters

ZKube can connect to real ZooKeeper environments. Before using it against shared or production clusters:

- verify the target hosts and authentication scope
- prefer validating risky actions in a non-production environment first
- avoid editing or deleting nodes unless you are sure about the blast radius
- treat imported connection data as sensitive operational configuration

## Repository Layout

- `electron/`
  Electron main process, preload bridge, and IPC registration
- `src/domain/`
  connection and ZooKeeper session domain logic
- `src/infrastructure/`
  local persistence, secure secret storage, and ZooKeeper client adapters
- `src/renderer/`
  React desktop UI, tree panel, workbench, runtime feedback, and connection flows
- `src/shared/`
  shared models, typed IPC contracts, and common declarations
- `tests/domain/`
  domain and IPC coverage
- `tests/renderer/`
  renderer and interaction tests
- `tests/e2e/`
  Electron smoke coverage
- `docs/superpowers/`
  design and implementation planning artifacts for this codebase

## Documentation

- Chinese guide: [README.zh-CN.md](./README.zh-CN.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Design spec: [docs/superpowers/specs/2026-05-13-zkube-desktop-design.md](./docs/superpowers/specs/2026-05-13-zkube-desktop-design.md)
- Implementation plan: [docs/superpowers/plans/2026-05-13-zkube-desktop-v1.md](./docs/superpowers/plans/2026-05-13-zkube-desktop-v1.md)

## Roadmap

Planned follow-up areas include:

- stronger connection-switch concurrency control
- stricter JSON import validation and transactional behavior
- richer ACL editing support
- broader platform support beyond the current Windows-first target

## Contributing

Contributions are welcome, especially around stability, UX refinement, packaging polish, and ZooKeeper workflow coverage.

When contributing:

- keep changes focused and test-backed
- prefer typed interfaces across Electron boundaries
- validate destructive flows carefully when touching ZooKeeper operations

## License

This repository is licensed under the MIT License. See [LICENSE](./LICENSE) for the full text.
