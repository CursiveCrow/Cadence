# Cadence Architecture Refactoring Plan

## Overview

This document outlines a comprehensive refactoring plan to reduce overengineering and simplify the Cadence codebase while maintaining all functionality.

## Current Architecture Problems

### 1. Excessive Abstraction Layers

- **7+ architectural layers** for what is essentially a task management UI
- Ports/Adapters pattern is overkill for current needs
- Multiple redundant abstraction boundaries

### 2. Redundant State Management

- Redux for UI state
- Yjs for persistence/CRDT
- Complex synchronization between both
- Unnecessary for a desktop app with local storage

### 3. Over-Engineered Renderer

- 385+ line engine class with too many responsibilities
- Separate controllers for DnD, PanZoom, Scene management
- Complex GPU grid implementation for simple grid lines

### 4. Platform Over-Abstraction

- Full abstraction layer for Electron vs Web
- Zod validation for IPC channels
- Too much ceremony for basic file operations

## Recommended Simplified Architecture

### New Folder Structure

```
src/
├── main/               # Electron main process
│   └── index.ts       # Simple main process
├── preload/           # Electron preload
│   └── index.ts       # Simple preload script
├── app/               # React application
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   ├── store/         # Redux store
│   ├── utils/         # Utilities
│   └── App.tsx        # Main app component
├── renderer/          # Canvas renderer (simplified)
│   ├── Renderer.ts    # Main renderer class
│   ├── shapes.ts      # Drawing utilities
│   └── utils.ts       # Helper functions
├── types/             # TypeScript types
│   └── index.ts       # All type definitions
└── index.html         # Entry HTML
```

## Phase 1: Consolidate State Management

### Remove Yjs/CRDT Layer

**Rationale**: For a desktop app with local storage, CRDT is unnecessary complexity.

**Action Items**:

1. Remove all Yjs dependencies
2. Use Redux as single source of truth
3. Implement simple JSON persistence to localStorage/file system
4. Direct Redux actions for all state updates

## Phase 2: Remove Ports/Adapters Pattern

### Direct Service Implementation

**Rationale**: Abstraction is premature for current app size.

**Action Items**:

1. Remove ApplicationPortsContext
2. Remove PersistencePort interface
3. Remove PlatformPort interface
4. Implement services directly where needed

## Phase 3: Simplify Renderer

### Single Renderer Class

**Rationale**: Current renderer has too many abstraction layers.

**Action Items**:

1. Merge Engine, SceneManager, DnD Controller into single Renderer class
2. Remove rendererPort abstraction
3. Simplify GPU grid to basic canvas drawing

## Phase 4: Simplify Platform Services

### Direct Electron API Usage

**Rationale**: Platform abstraction is overkill for basic file operations.

**Action Items**:

1. Remove platform ports/adapters
2. Use Electron APIs directly in main process
3. Simple IPC without Zod validation

## Phase 5: Flatten Directory Structure

### Before

```
source/
├── adapters/
├── application/
├── core/
├── infrastructure/
├── renderer/
└── surface/
```

### After (Updated)

```
src/
├── state/       # Redux store and slices
├── styles/      # Centralized CSS styles
├── renderer/    # PixiJS rendering (single class + small helpers)
├── main/        # Electron main
├── types/       # Shared types
└── utils/       # Shared utilities
```

## Completed File Renames (Renderer)

Applied to reduce ambiguity and reflect responsibilities:

- `src/renderer/config.ts` → `src/renderer/timelineConfig.ts` (done)
- `src/renderer/utils.ts` → `src/renderer/timelineMath.ts` (done)
- `src/renderer/layout.ts` → `src/renderer/timeScale.ts` (done)
- `src/renderer/draw/notes.ts` → `src/renderer/draw/tasks.ts` (done)

## Implementation Strategy

### State Management

- [ ] Remove Yjs/CRDT
- [ ] Consolidate to Redux only
- [ ] Add persistence middleware
- [ ] Update all components to use simplified state

### Remove Abstractions

- [ ] Remove ports/adapters pattern
- [ ] Direct service implementation
- [ ] Simplify dependency injection
- [ ] Update imports

### Renderer Simplification

- [ ] Merge renderer classes
- [ ] Simplify event handling
- [ ] Remove GPU grid complexity
- [ ] Direct canvas/Pixi.js usage

### Platform & Structure

- [ ] Simplify Electron integration
- [ ] Remove IPC abstractions
- [ ] Flatten directory structure
- [ ] Update build configuration

## Benefits After Refactoring

### Code Reduction

- **Estimated 40-50% less code**
- From ~7000 LOC to ~3500 LOC
- Fewer files and directories

### Developer Experience

- Easier to navigate codebase
- Clear data flow
- Faster development
- Easier debugging
- Better IDE support

### Performance

- Faster build times
- Smaller bundle size
- Less memory usage
- Fewer abstraction layers

### Maintainability

- Less complexity to manage
- Fewer dependencies
- Clearer architecture
- Easier onboarding

## Testing Strategy

### Unit Tests

- Test Redux reducers directly
- Test renderer methods
- Test utility functions

### Integration Tests

- Test complete user flows
- Test file save/load
- Test task operations

### E2E Tests

- Use Playwright for Electron
- Test actual user workflows

## Rollback Plan

If issues arise:

1. Keep old architecture branch
2. Can revert specific modules
3. Incremental rollback possible
4. Feature flags for gradual migration

## Success Metrics

### Quantitative

- Lines of code: -40%
- Build time: -30%
- Bundle size: -25%
- Number of files: -50%

### Qualitative

- Developer survey on complexity
- Time to implement new features
- Bug resolution time
- Onboarding time for new developers

## Conclusion

This refactoring plan will transform Cadence from an over-engineered application into a clean, maintainable codebase that's appropriate for its actual requirements. The simplified architecture will accelerate development, improve performance, and make the codebase more accessible to contributors.

The key principle: **Use the simplest solution that works, and add complexity only when proven necessary.**
