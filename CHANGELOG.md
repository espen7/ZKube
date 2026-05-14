# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog, and this project follows Semantic Versioning while it moves toward a stable `1.0.0`.

## [Unreleased]

- Ongoing hardening, UX polish, and follow-up features are tracked here before the next tagged release.

## [0.1.0] - 2026-05-14

Initial public baseline for the Windows-first desktop workbench.

### Added

- Electron + React + TypeScript desktop runtime for ZooKeeper workflows
- connection profile creation, persistence, and JSON import
- lazy-loaded node tree browsing with local filtering and deep search
- multi-tab workbench for opening nodes from the tree and search results
- node payload editing with JSON / XML formatting helpers
- `world:anyone` ACL inspection and editing
- runtime feedback, connection-state handling, and Electron smoke coverage

### Packaging

- Windows installer packaging with `electron-builder`
- versioned desktop artifacts generated from the repository package version

### Notes

- Windows is the primary supported platform in this release
- ACL editing is intentionally scoped to the `world:anyone` record
- advanced features such as SSH tunneling are planned for later iterations
