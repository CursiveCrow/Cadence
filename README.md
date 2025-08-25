# Cadence

**A streamlined, high-performance, offline-first project management system using Electron, TypeScript, React, PixiJS, and CRDTs.**

## Architecture

Cadence is built as a monorepo following the architecture specified in the [Design Document](docs/Design.md). The system features:

- **Desktop-first** Electron application with React 18 + TypeScript
- **High-performance rendering** via PixiJS with mandatory OffscreenCanvas
- **Offline-first** architecture using CRDTs (Yjs) as Single Source of Truth
- **SQLite WASM + OPFS** for persistence in the renderer process
- **Redux Toolkit** for UI state management separate from domain data
- **Built-in undo/redo** via Y.UndoManager

## Project Structure

```
cadence/
├── apps/
│   └── desktop/                # Electron main/preload + Renderer (Vite)
│       ├── electron/           # Main process and preload scripts
│       ├── src/               # React renderer process
│       ├── dist/              # Built renderer files
│       └── dist-electron/     # Built main process files
├── packages/
│   ├── core/                  # Domain types, algorithms (DAG, lanes), validation
│   ├── state/                 # RTK Stores (UI state management)
│   ├── crdt/                  # Yjs initialization, persistence, mutation functions, hooks
│   ├── renderer/              # PixiJS implementation, Worker setup, OffscreenCanvas
│   ├── platform-services/     # FS access, dialogs (Electron IPC/Web APIs)
│   └── ui/                    # Reusable React UI components
├── release/                   # Packaged desktop applications
└── docs/                      # Design documentation
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

- **Windows**: `Cadence-win32-x64/Cadence.exe`
- **macOS**: `Cadence-darwin-x64/Cadence.app` (when built on macOS)
- **Linux**: `Cadence-linux-x64/Cadence` (when built on Linux)

## Technology Stack

### Core Technologies

- **Electron** - Desktop app framework
- **React 18** - UI framework with TypeScript
- **Vite** - Build tool and dev server
- **pnpm + Turborepo** - Monorepo management

### Planned Features (Per Design.md)

- **PixiJS (WebGL2)** - High-performance timeline canvas rendering
- **Yjs** - CRDT for offline-first data management
- **SQLite WASM + OPFS** - Client-side persistence
- **Redux Toolkit** - UI state management
- **Zod** - Runtime validation

## Package Overview

- **`@cadence/core`** - Domain types, DAG validation, lane assignment algorithms
- **`@cadence/state`** - Redux Toolkit slices for UI state (viewport, selection)
- **`@cadence/crdt`** - Yjs document management, mutations, React hooks
- **`@cadence/renderer`** - PixiJS + OffscreenCanvas implementation
- **`@cadence/platform-services`** - Abstraction layer for Electron IPC vs Web APIs
- **`@cadence/ui`** - Reusable React components (Button, TaskCard, TimelineCanvas)

## Scripts

- `pnpm dev` - Start desktop app development
- `pnpm build` - Build all packages
- `pnpm electron:dev` - Start Electron app with hot reload
- `pnpm electron:dist` - Build and package desktop app
- `pnpm lint` - Run linting across all packages
- `pnpm test` - Run tests across all packages

## Development Status

✅ **Completed:**

- Monorepo structure with proper workspace configuration
- Electron + Vite + React + TypeScript setup
- Desktop app packaging with electron-packager
- Core domain types and validation schemas
- Basic UI components and state management setup
- CRDT foundation with Yjs integration

🚧 **In Development:**

- PixiJS + OffscreenCanvas integration
- SQLite WASM + OPFS persistence layer
- Timeline rendering and interaction
- Lane assignment and DAG validation algorithms

## License

Private project.
