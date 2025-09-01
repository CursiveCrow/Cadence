# Cadence

A streamlined, high-performance, offline-first project management system using Electron, TypeScript, React, PixiJS, and CRDTs.

## Architecture

Cadence is a single Electron app with internal modules (no monorepo). The system features:

- Desktop-first Electron application with React 18 + TypeScript
- High-performance rendering via PixiJS (WebGPU/WebGL)
- Offline-first architecture using CRDTs (Yjs) as the domain store
- In-memory CRDT persistence (swappable provider)
- Redux Toolkit for UI state management
- Built-in undo/redo via Y.UndoManager

## Project Structure

```
cadence/
  apps/
    desktop/
      electron/           # Main process and preload scripts
      src/
        core/             # Domain types, algorithms, config
        renderer/         # PixiJS engine (grid, DnD, pan/zoom, plugins)
        platform/         # IPC contracts + Electron/Web services
        surface/          # React UI + UI components + styles
          state/          # Redux UI store + Yjs CRDT (hooks, mutations, persistence)
      dist/
      dist-electron/
  release/                # Packaged desktop applications
  docs/                   # Design documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
pnpm install
```

### Development

Start the desktop app in development mode:

```bash
pnpm run electron:dev
```

### Building

Build and package the desktop application:

```bash
# Build for current platform (Windows)
pnpm run electron:dist

# Build for all platforms
pnpm run electron:dist-all
```

The packaged applications will be in the `release/` directory:

- Windows: `Cadence-win32-x64/Cadence.exe`
- macOS: `Cadence-darwin-x64/Cadence.app` (when built on macOS)
- Linux: `Cadence-linux-x64/Cadence` (when built on Linux)

## Technology Stack

- Electron - Desktop app framework
- React 18 + TypeScript
- Vite - Build tool and dev server
- PixiJS (WebGPU/WebGL) - High-performance timeline rendering
- Yjs - CRDT for domain data, undo/redo via UndoManager
- Redux Toolkit - UI state management
- Zod - Runtime validation

## Internal Modules

- `apps/desktop/src/core` - Domain types, DAG validation, lane assignment algorithms, config
- `apps/desktop/src/surface` - React UI + components + styles
- `apps/desktop/src/surface/state` - Redux UI store + Yjs (CRDT) hooks/mutations/persistence
- `apps/desktop/src/renderer` - PixiJS engine (grid, DnD, pan/zoom, plugins)
- `apps/desktop/src/platform` - Electron/Web platform services + IPC contracts

## Scripts

- `pnpm dev` - Start desktop app development
- `pnpm build` - Build desktop app
- `pnpm electron:dev` - Start Electron app with hot reload
- `pnpm electron:dist` - Build and package desktop app
- `pnpm clean` - Clean desktop build artifacts
- `pnpm test` - Run tests (if present)

## Development Status

Completed:

- Single-app structure with internal modules
- Electron + Vite + React + TypeScript setup
- Desktop app packaging
- Core domain types and validation
- UI components and Redux state
- Yjs CRDT integration (in-memory persistence)

In Development:

- Advanced PixiJS features (GPU grid, plugins)
- Pluggable persistence (e.g., y-indexeddb or SQLite WASM)
- Timeline interactions and polish

## License

Private project.
