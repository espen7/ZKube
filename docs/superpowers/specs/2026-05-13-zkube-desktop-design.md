# ZKube Desktop Design

**Date:** 2026-05-13

**Status:** Approved in conversation, pending written-spec review

## Summary

ZKube is a Windows-first ZooKeeper desktop client built with modern Electron and React. It takes its functional scope from PrettyZoo's core day-to-day workflow, but its product feel, layout hierarchy, and desktop polish should lean closer to RedisInsight.

The first release should prioritize a strong operator workspace over breadth. It will focus on direct ZooKeeper connections, multi-connection management, node browsing and editing, focused real-time refresh, ACL editing, and a professional desktop UI. SSH tunnel support, terminal features, monitoring dashboards, and plugin-style extensibility are explicitly deferred.

## Product Goals

1. Provide a modern Windows desktop GUI for ZooKeeper that feels faster and more polished than traditional Java desktop tools.
2. Cover the highest-frequency workflows for engineers and operators:
   - manage multiple connections
   - browse and search the node tree
   - inspect and edit node data
   - create and delete nodes
   - view and edit ACLs
3. Make the UI feel intentional and productive, with layout and interaction patterns inspired by RedisInsight rather than legacy admin panels.
4. Keep the architecture light enough for a fast v1 while preserving clean extension points for future SSH tunnel, monitoring, and command features.

## Non-Goals For V1

- SSH tunnel support
- Embedded terminal / command-line mode
- Multi-platform packaging beyond Windows
- Full-tree watcher coverage
- Monitoring dashboards
- Draft auto-recovery
- History versioning or diff compare
- Plugin system

## Confirmed Scope Decisions

- **Platform:** Windows only for the first release
- **Connection mode:** direct ZooKeeper connection only
- **Functional scope:** core workbench first, not full PrettyZoo parity
- **Editor level:** advanced editor with syntax highlighting
- **Secrets storage:** save connection configuration locally, with sensitive data protected by Windows-native secure storage

## Reference Direction

### PrettyZoo Reference

PrettyZoo is the feature reference, especially for:

- multi-connection workflows
- node CRUD operations
- ACL management
- tree-based exploration
- formatted JSON and XML display

ZKube should reproduce the most useful operational workflows from that tool, while avoiding its older visual density and desktop-era interaction patterns.

### RedisInsight Reference

RedisInsight is the design and layout reference, especially for:

- spatial hierarchy
- clear action entry points
- multi-panel workbench structure
- stronger visual polish
- code-editor-centered data workflows

ZKube should feel like a modern operator console, not a generic admin dashboard and not a direct PrettyZoo visual clone.

## Architecture

The recommended architecture is a layered desktop application:

- `Electron Main`
- `Preload IPC Bridge`
- `React Renderer`
- `Node-based Domain Services`
- `Infrastructure Adapters`

This keeps the app lighter than a RedisInsight-style embedded API server while avoiding the fragility of putting all ZooKeeper logic directly into Electron window code.

### Main Process Responsibilities

- create and manage the application window
- register native menus and app lifecycle events
- locate and manage user config directories
- host privileged filesystem and OS integrations
- coordinate long-lived domain services when needed

The main process must not become a dump site for UI state or ZooKeeper interaction details.

### Preload Responsibilities

The preload layer exposes a narrow, audited IPC surface to the renderer. The renderer should never receive raw Node or Electron privileges.

Initial API surface should include methods in these groups:

- `connections.*`
- `tree.*`
- `node.*`
- `acl.*`
- `app.*`

Representative operations:

- list, create, update, delete, and connect stored connections
- load children for a path
- fetch node data, stat, and ACL
- save node contents
- create and delete nodes
- subscribe to connection and node events

### Renderer Responsibilities

The renderer owns:

- application layout
- navigation state
- tab state
- form state
- user feedback
- command bar interactions
- node editing experience

It should not know transport-level ZooKeeper details. It consumes typed view models and domain events through the preload API.

### Domain Services Responsibilities

The domain layer owns the core behavior:

- connection session lifecycle
- ZooKeeper client management
- watcher registration and disposal
- lazy tree loading
- node cache coordination
- data formatting
- ACL translation and validation
- error normalization

This layer is the behavioral heart of the app and should remain testable without a rendered UI.

### Infrastructure Responsibilities

Infrastructure adapters isolate external concerns:

- ZooKeeper client adapter
- local configuration storage
- Windows secure secret storage
- logging
- packaging-aware path helpers

This makes it easier to swap or upgrade external libraries without rewriting UI or domain behavior.

## Proposed Project Structure

The initial file and folder layout should follow these boundaries:

- `electron/main/`
- `electron/preload/`
- `src/renderer/app/`
- `src/renderer/features/connections/`
- `src/renderer/features/tree/`
- `src/renderer/features/node-editor/`
- `src/renderer/features/node-meta/`
- `src/renderer/features/node-acl/`
- `src/renderer/features/layout/`
- `src/domain/connections/`
- `src/domain/tree/`
- `src/domain/nodes/`
- `src/domain/acl/`
- `src/domain/events/`
- `src/infrastructure/storage/`
- `src/infrastructure/security/`
- `src/infrastructure/zookeeper/`
- `src/shared/`

The structure is intentionally grouped by responsibility, not by generic technical layer alone.

## UI And Interaction Design

### Global Layout

The desktop layout should use a three-column workbench:

1. left workspace sidebar
2. center tabbed content area
3. right contextual details drawer

It should also include:

- a top command bar
- a bottom status bar

This produces a more professional and spacious information hierarchy than a single crowded split pane.

### Left Workspace Sidebar

The left column combines:

- saved connections
- current connection state
- the active node tree

Design intent:

- connection selection should feel like switching workspaces
- the node tree should support lazy expansion
- filtering should be immediate on loaded nodes
- node actions should be available through context menus and inline shortcuts

The sidebar should visually separate connection controls from tree navigation so the two concepts do not blur together.

### Center Tabbed Content Area

The center column is the primary work surface. Opening a node should create or focus a tab rather than forcing every action into one shared detail panel.

Each node tab should expose three primary panels:

- `Data`
- `Meta`
- `ACL`

This preserves focus and lets users keep multiple nodes open in parallel.

### Right Context Drawer

The right drawer provides lightweight context and fast actions:

- current path summary
- stat highlights
- quick copy path
- refresh current node
- create child node
- delete node

On wider desktop layouts it should stay visible. On narrower widths it can collapse behind a toggle.

### Top Command Bar

The command bar is a compact action layer, not a terminal. It should include:

- global node search entry
- active connection switcher
- create node action
- refresh action
- import and export connection settings

This brings the most common actions into one predictable place.

### Bottom Status Bar

The status bar should communicate runtime state clearly:

- connection state
- last refresh or sync time
- active watcher count
- background operation feedback

This reduces ambiguity during reconnects, refreshes, and save operations.

## Visual Direction

The visual design should be clean, neutral, and technical.

### Desired Feel

- professional operator console
- modern desktop app
- calm but high-information workspace

### Avoid

- legacy Java desktop styling
- generic admin template styling
- crowded borders and low-value chrome
- novelty-heavy gradients or decorative visuals that compete with data

### Styling Principles

- strong spacing rhythm
- restrained color palette
- purposeful accent color
- clear card and panel boundaries
- typography hierarchy that separates navigation, metadata, and code editing

The editor surface should use an appropriate monospace font, while the surrounding UI should use a polished, readable sans-serif stack.

## Data Flow

The first release should use a session-driven, on-demand loading model.

### Session Lifecycle

When a user opens a connection, the app creates a session object that owns:

- the active ZooKeeper client
- connection status
- tree cache
- open-node subscriptions
- watcher registrations

This session is the source of truth for that connection's runtime state.

### Tree Loading

The tree should load lazily:

- root-level nodes load on connect
- child nodes load on expand
- the app caches loaded children per session

The app should not attempt to mirror the full ZooKeeper tree in memory.

### Node Detail Loading

Opening a node tab loads:

- raw node data
- stat metadata
- ACL data

These are fetched when needed and refreshed again after save or event invalidation.

### Search Behavior

Two search modes should be supported:

1. fast filter over already-loaded tree content
2. explicit deeper search action for remote traversal

The deeper search must be intentional rather than tied to every keystroke.

## Real-Time Sync Strategy

The first release should provide focused real-time responsiveness, not global watch coverage.

### Watch Scope

Watchers should be registered only for:

- expanded tree branches
- currently opened node tabs
- connection state

This limits noise, resource consumption, and complexity.

### Event Types

The domain layer should normalize low-level events into a small set of app-level events:

- `nodeDataChanged`
- `nodeChildrenChanged`
- `nodeDeleted`
- `connectionStateChanged`

These events travel through IPC to the renderer, which refreshes only affected UI regions.

### Refresh Behavior

When an event arrives:

- a changed node tab refreshes its data
- a changed parent branch refreshes its children list
- a deleted node closes or marks the affected tab
- a connection event updates the status bar and connection indicator

## Editing Experience

The node data editor is one of the most important value surfaces in the product.

### Editor Capabilities

The first release should support:

- plain text editing
- syntax highlighting
- JSON formatting
- XML formatting
- read-only and editable modes
- save and refresh controls

The implementation should use a serious editor component such as Monaco rather than a textarea-based stopgap.

### Save Semantics

All writes should go through a domain-level save operation that:

- validates current node existence
- checks version-aware update behavior
- maps known failure conditions into actionable UI messages
- refreshes the active tab and affected tree state on success

## ACL Experience

ACLs should be editable without requiring users to memorize low-level structures.

### ACL UI

The UI should present ACL entries in a structured form:

- scheme
- id
- permissions

Permissions should be edited with clear toggles or checkboxes rather than requiring opaque manual strings.

### ACL Behavior

The domain layer should:

- convert UI ACL models into ZooKeeper client payloads
- validate incomplete or unsupported ACL shapes
- return readable validation errors

## Error Handling

The app should distinguish between technical errors and operator-facing feedback.

### Error Categories

Representative normalized error codes:

- `CONNECTION_TIMEOUT`
- `CONNECTION_LOST`
- `NODE_NOT_FOUND`
- `NODE_ALREADY_EXISTS`
- `BAD_VERSION`
- `ACL_INVALID`
- `UNKNOWN_FAILURE`

### Presentation Rules

- transient success and warning feedback uses toast notifications
- persistent runtime state appears in the status bar
- inline field or editor problems appear near the affected interaction surface

Raw stack traces must not be the primary user-facing message.

## Local Storage And Secrets

The app needs local persistence for convenience, but must not store sensitive data carelessly.

### Persisted Locally

- saved connection definitions
- recent connection history
- window state
- UI preferences

### Secret Handling

Sensitive connection material should be protected through Windows-native secure storage. The plaintext secret should not be written into the normal configuration file.

### Deferred Storage Features

The first release should not persist unsaved node-edit drafts across restarts.

## Recommended Technology Stack

The implementation should use current stable desktop-web tooling.

- Electron `42.0.1`
- React `19.2.6`
- React DOM `19.2.6`
- TypeScript
- Vite `7.1.4`
- electron-builder `26.0.12`
- Monaco Editor

### State Management

Use a light client-state solution such as Zustand for renderer state that is purely presentational or session-adjacent.

Do not introduce a heavy global architecture by default. The core source of truth remains the domain session layer and IPC event stream.

### Data Fetching Model

Do not force a generic request cache abstraction over watcher-driven desktop behavior in v1. Event-driven refresh and focused local state are a better fit than a web-style server-state library as the primary model.

## Testing Strategy

The first release should test the behavior that is most likely to break operator trust.

### Domain Tests

Cover:

- session lifecycle
- watcher registration and disposal
- event normalization
- node save behavior
- ACL mapping and validation
- error normalization

### Renderer Tests

Cover:

- tree expansion behavior
- tab opening and switching
- editor save feedback
- ACL form interaction
- connection-state presentation

### Packaging Smoke Tests

For Windows packaging, include at least:

- application launch smoke test
- preload bridge availability check
- config directory creation check

## Release Boundary

The first shippable milestone is a polished Windows desktop workbench that can:

1. save and manage direct ZooKeeper connections
2. browse a node tree with lazy loading
3. open multiple node tabs
4. view and edit node data with a rich editor
5. create and delete nodes
6. view and edit ACLs
7. react to focused node and branch changes

If a feature does not materially support that milestone, it should be deferred.

## Phase 2 Candidates

After the first release is stable, the most natural next additions are:

1. SSH tunnel support
2. terminal or command pane
3. broader search and bulk operations
4. monitoring and dashboard views
5. macOS and Linux packaging
6. diff and history tooling

## Open Implementation Notes

- The exact ZooKeeper Node.js client should be chosen during implementation based on maintenance status, watch behavior, and Windows packaging compatibility.
- The first implementation should keep IPC contracts explicit and typed from day one.
- The UI should be built with desktop-sized layouts first, then tightened for smaller widths, rather than starting from a mobile-responsive mindset.
