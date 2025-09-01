# Cadence - Refactored Architecture

## Overview

This is the refactored version of the Cadence Timeline Manager, rebuilt using Clean Architecture principles, Domain-Driven Design (DDD), and modern React patterns.

## Architecture

The application follows a clean architecture with the following layers:

### Core Layer (`/core`)

- **Domain**: Pure business logic, entities, value objects, and domain services
- **Use Cases**: Application-specific business rules, commands, and queries (CQRS pattern)

### Infrastructure Layer (`/infrastructure`)

- **Persistence**: Redux store implementation and repositories
- **Platform**: Electron and Web platform services
- **Seed**: Demo data and initialization

### Renderer Layer (`/renderer`)

- **Core**: Rendering engine, scene graph, and viewport management
- **Components**: Task, grid, and dependency renderers
- **Systems**: Animation and interaction systems

### Surface Layer (`/surface`)

- **Components**: React UI components
- **Containers**: Smart components connected to Redux
- **Hooks**: Custom React hooks with React 19 features

## Key Improvements

1. **Clean Architecture**: Clear separation of concerns with dependency inversion
2. **Domain-Driven Design**: Rich domain models with business logic encapsulated
3. **CQRS Pattern**: Separation of commands and queries for better scalability
4. **React 19 Features**: Leveraging useOptimistic, useTransition, and Suspense
5. **Type Safety**: Full TypeScript coverage with strict typing
6. **Performance**: Optimized rendering pipeline with WebGL/WebGPU support
7. **Testability**: Highly testable architecture with dependency injection

## Getting Started

### Prerequisites

- **Node.js (v18+) and npm**
- Install Node.js: https://nodejs.org/en/download

## Development

### Project Structure

```
source/
├── core/                  # Business logic layer
│   ├── domain/           # Entities, value objects, services
│   └── use-cases/        # Commands and queries
├── infrastructure/       # Technical implementations
│   ├── persistence/      # Redux store
│   └── platform/         # Platform-specific code
├── renderer/             # Canvas rendering engine
│   ├── core/            # Engine core
│   └── components/      # Visual components
├── surface/              # React UI layer
│   ├── components/      # UI components
│   └── containers/      # Smart components
└── config/              # Configuration

```

### Key Technologies

- **Node + Electron**: Desktop application framework
- **React 19.1**: Latest React with concurrent features
- **Redux Toolkit**: State management
- **PIXI.js v8**: WebGL rendering
- **TypeScript 5.3+**: Type safety
- **Vite**: Fast build tooling

## Testing

The architecture supports comprehensive testing:

- **Unit Tests**: Domain logic and services
- **Integration Tests**: Use cases and repositories
- **Component Tests**: React components
- **E2E Tests**: Full application flows

## Contributing

Please follow the established architecture patterns:

1. Keep domain logic pure and framework-agnostic
2. Use dependency injection for testability
3. Follow the SOLID principles
4. Write tests for new features
5. Update documentation as needed

## License

MIT
