# Cadence - Musical Project Management

A clean, elegant musical project management application built with **PixiJS**, **Redux Toolkit**, and **Electron**.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-success)
![Architecture](https://img.shields.io/badge/Architecture-Clean-green)

## 🎵 **Overview**

Cadence provides a musical staff-based visualization for project timelines, allowing you to manage tasks as musical notes on staffs with proper time signatures and dependencies represented as musical slurs.

### **Key Features**

- **Musical Timeline**: Tasks appear as notes on musical staffs
- **Time Signatures**: Each staff can have different time signatures (4/4, 3/4, etc.)
- **Dependencies**: Visual dependency chains represented as musical slurs
- **Real-time Editing**: Drag, resize, and modify tasks directly on the timeline
- **Staff Management**: Create and manage multiple staffs with customizable properties
- **Responsive Zoom**: Smooth zooming with adaptive level-of-detail rendering

## 🏗️ **Architecture**

Cadence follows a **clean, modular architecture** with surgical separation of concerns:

```
src/
├── app/                     # Application lifecycle and bootstrapping
│   ├── bootstrap.ts         # Main application initialization
│   ├── interactions/        # Event handling and user interactions
│   │   ├── eventHandlers.ts # Pointer events and canvas interactions
│   │   ├── taskOperations.ts# Task manipulation utilities
│   │   ├── InputManager.ts  # Centralized input delegation system
│   │   └── viewportUtils.ts # Viewport manipulation utilities
│   └── demo/                # Development demo data
│       └── seedData.ts      # Demo project generation
├── renderer/                # PixiJS rendering system
│   ├── core/                # Core rendering infrastructure
│   │   ├── PixiApplication.ts    # PixiJS lifecycle management
│   │   ├── ViewportManager.ts    # Viewport operations
│   │   ├── ViewportCulling.ts    # Performance culling system
│   │   ├── ObjectPool.ts         # Graphics object pooling
│   │   ├── ErrorBoundary.ts      # Error handling and logging
│   │   └── Renderer.ts           # Orchestrating renderer (new architecture)
│   ├── ui/                  # UI rendering components
│   │   ├── HudRenderer.ts        # Header and sidebar rendering
│   │   ├── ModalRenderer.ts      # Modal dialogs and popups
│   │   └── TooltipRenderer.ts    # Task tooltips and hover effects
│   ├── graphics/            # Visual rendering components
│   │   ├── TaskRenderer.ts       # Task visualization and caching
│   │   ├── GridRenderer.ts       # Grid, staff lines, and markers
│   │   └── EffectsRenderer.ts    # Visual effects and animations
│   ├── draw/                # Low-level drawing utilities
│   │   ├── grid.ts               # Grid and staff line primitives
│   │   ├── tasks.ts              # Task note head and label rendering
│   │   └── markers.ts            # Measure markers and today line
│   └── utils/               # Rendering mathematics and utilities
│       └── index.ts              # Timeline math, viewport transforms
├── state/                   # Redux Toolkit state management
│   ├── store.ts             # Store configuration and persistence
│   ├── ui.ts                # UI state (viewport, selection, scaling)
│   ├── tasks.ts             # Task state management
│   ├── staffs.ts            # Staff state management
│   ├── dependencies.ts      # Dependency relationships
│   └── selectors.ts         # Memoized selectors for complex queries
├── types/                   # TypeScript type definitions
│   ├── index.ts             # Domain types (Task, Staff, Dependency)
│   └── renderer.ts          # Renderer interfaces and contracts
├── config/                  # Configuration and constants
│   ├── index.ts             # Project configuration
│   └── ui.ts                # UI constants and magic numbers
├── styles/                  # CSS styling (minimal, for DOM elements)
│   ├── ui.css               # Main stylesheet imports
│   ├── tokens.css           # Design tokens and CSS variables
│   ├── base.css             # Global base styles and animations
│   └── layout.css           # DOM layout structure
├── main/                    # Electron main process
│   └── index.ts             # Electron app lifecycle
├── preload/                 # Electron preload script
│   └── index.ts             # Context bridge setup
└── index.html               # Application entry point
```

## ⚡ **Key Architectural Principles**

### **1. Single Responsibility**

- Each module has one clear purpose
- Renderer components are specialized (HUD vs Tasks vs Grid)
- Event handling separated from business logic

### **2. Clean Dependencies**

- **No circular dependencies**
- **Clear import hierarchy**: utilities → core → specialized → orchestration
- **Minimal coupling** between components

### **3. Performance-First**

- **Object pooling** for frequently created Graphics objects
- **Viewport culling** to avoid rendering off-screen elements
- **Memoized selectors** for complex state calculations
- **RAF-coalesced rendering** to prevent frame drops

### **4. Error Resilience**

- **Comprehensive error boundaries** around all rendering operations
- **Graceful degradation** when components fail
- **Detailed logging** for debugging and monitoring
- **Health checks** for critical systems

## 🚀 **Getting Started**

### **Prerequisites**

- Node.js 18+
- npm 9+

### **Development**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Run Electron app
npm run electron

# Build distributables
npm run dist
```

### **Scripts**

- `npm run dev` - Start Vite dev server with hot reload
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run typecheck` - Run TypeScript compiler checks
- `npm run lint` - Run ESLint on TypeScript files
- `npm run electron` - Launch Electron app
- `npm run dist` - Build distributable packages
- `npm run clean` - Clean build artifacts

## 📐 **State Management**

### **Redux Toolkit Slices**

- **`ui`**: Viewport, selection, vertical scaling
- **`tasks`**: Task CRUD operations
- **`staffs`**: Staff management and ordering
- **`dependencies`**: Task dependency relationships

### **Memoized Selectors** (Performance)

```typescript
// Get tasks grouped by staff (with caching)
const tasksByStaff = useSelector(selectTasksByStaff)

// Get visible tasks for current viewport (optimized)
const visibleTasks = useSelector(selectVisibleTasks)

// Get critical path analysis
const criticalPath = useSelector(selectCriticalPath)
```

## 🎨 **Rendering Pipeline**

### **PixiJS v8.13 Rendering**

1. **Background & Grid**: Timeline grid and staff lines
2. **Tasks**: Musical note visualization with status glyphs
3. **Dependencies**: Musical slur curves between connected tasks
4. **Effects**: Hover highlights and visual feedback
5. **HUD**: Date header and sidebar (screen-space overlay)
6. **Modals**: Staff manager and task detail popups

### **Performance Features**

- **Object Pooling**: Reuses Graphics objects to reduce garbage collection
- **Viewport Culling**: Only renders visible tasks and dependencies
- **Level-of-Detail**: Reduces detail for distant objects
- **Spatial Indexing**: Fast culling using quadtree-like structures

## 🔧 **Development Guidelines**

### **Adding New Features**

1. **Identify the appropriate layer**: UI, Graphics, Core, or State
2. **Use existing patterns**: Follow established component structure
3. **Add error boundaries**: Wrap operations with `safePixiOperation`
4. **Create tests**: Add unit tests for new utilities
5. **Update selectors**: Add memoized selectors for complex queries

### **Performance Considerations**

- Use **object pooling** for frequently created graphics
- Implement **viewport culling** for new renderable objects
- Add **memoized selectors** for expensive state calculations
- Wrap render operations in **error boundaries**

### **Code Style**

- **TypeScript strict mode** enforced
- **Single responsibility** per module
- **Explicit error handling** with fallbacks
- **Comprehensive documentation** for public APIs

## 🐛 **Debugging**

### **Error Logging**

The application includes comprehensive error logging:

```typescript
import { errorLogger } from './renderer/core/ErrorBoundary'

// View all logged errors
const logs = errorLogger.getLogs()

// View errors from specific component
const rendererLogs = errorLogger.getLogs('TaskRenderer')
```

### **Performance Monitoring**

```typescript
// Get object pool statistics
const poolStats = objectPool.getStats()

// Get culling effectiveness
const cullingStats = taskCuller.getPerformanceMetrics()

// Get renderer performance
const renderStats = renderer.getStats()
```

## 📊 **Performance Metrics**

After the comprehensive refactoring:

- **🏗️ Modularity**: 1,457-line monolith → 14 focused modules
- **🎯 Type Safety**: 100% TypeScript strict mode compliance
- **⚡ Performance**: Object pooling + viewport culling + memoization
- **🛡️ Reliability**: Comprehensive error boundaries + logging
- **🧪 Testability**: Isolated, testable components
- **📚 Maintainability**: Single responsibility + clear dependencies

## 🔮 **Future Extensions**

The new architecture enables:

- **Plugin System**: Easy to add new renderer components
- **Advanced Effects**: Particle systems and shader effects
- **Collaborative Editing**: Real-time state synchronization
- **Export Formats**: PDF, SVG, MIDI export capabilities
- **Accessibility**: Screen reader and keyboard navigation support

## 🎯 **Project Status**

**Current Version**: 2.0.0 - **Post-PixiJS Migration**

- ✅ **Migrated from React to PixiJS** for better performance
- ✅ **Comprehensive architectural refactoring** completed
- ✅ **Clean modular structure** with separation of concerns
- ✅ **Performance optimizations** and error handling
- ✅ **Full TypeScript strict compliance**

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 **Contributing**

1. Follow the established **clean architecture** patterns
2. Maintain **single responsibility** per module
3. Add **comprehensive error handling**
4. Include **unit tests** for new functionality
5. Update **documentation** for architectural changes

---

**Built with ♫ for musical project management**
