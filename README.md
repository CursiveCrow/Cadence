# Cadence - Musical Timeline Management

A sophisticated timeline and project management tool that uses musical metaphors to visualize and manage complex projects.

## Overview

Cadence treats projects as musical "Scores" containing "Measures" (time slices), with "Chords" grouping parallel "Notes" (tasks). Dependencies align "melodies" horizontally, creating an intuitive visual representation of project flow.

## Features

- **Musical Timeline Visualization**: Staff lines, measures, and notes rendered on a GPU-accelerated canvas
- **Smart Lane Assignment**: Automatic melody alignment keeps dependency chains on the same horizontal lane
- **Offline-First Architecture**: Full CRUD operations without network connectivity
- **Cross-Platform**: Web, Desktop (Electron), and Mobile (React Native) support
- **High Performance**: 60+ FPS rendering with support for 1,000+ notes and 2,000+ dependencies

## Tech Stack

- **Frontend**: React 18, TypeScript, PixiJS (WebGL rendering)
- **State Management**: Zustand, Yjs CRDT for offline-first sync
- **Build System**: pnpm, Turborepo, Vite
- **Styling**: Tailwind CSS
- **Backend** (planned): Node.js, GraphQL, PostgreSQL, Redis

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Build the domain package
pnpm --filter @cadence/domain build

# Start the development server
pnpm --filter @cadence/web dev
```

The application will open at http://localhost:3000

## Project Structure

```
cadence/
├── apps/
│   ├── web/          # React web application
│   ├── desktop/      # Electron desktop wrapper (planned)
│   └── mobile/       # React Native mobile app (planned)
├── packages/
│   ├── domain/       # Core business logic and algorithms
│   ├── renderer/     # Canvas rendering logic (planned)
│   └── crdt/         # CRDT for offline-first sync (planned)
└── services/         # Backend services (planned)
```

## Core Concepts

### Domain Model

- **Score**: A project timeline with start/end dates and tempo
- **Note**: An atomic task with title, duration, and position
- **Dependency**: A directed edge between notes
- **Chord**: Notes that start at the same beat (parallel tasks)
- **Measure**: Time segments in the timeline

### Algorithms

- **Quantizer**: Converts between timestamps and musical beats
- **DAG Validator**: Ensures no circular dependencies
- **Lane Assigner**: Places notes to minimize vertical movement in dependency chains
- **Chord Grouper**: Groups parallel notes into chords

## Development Status

✅ Phase 1 - Foundation (MVP)
- Monorepo setup with pnpm and Turborepo
- Domain package with core algorithms
- Web app with PixiJS timeline canvas
- Basic timeline rendering and interaction

🚧 Phase 2 - In Progress
- CRDT for offline-first storage
- Desktop and mobile applications
- Backend services with GraphQL API

📋 Phase 3 - Planned
- Real-time collaboration
- Advanced forecasting features
- Portfolio multi-score view

## License

MIT
