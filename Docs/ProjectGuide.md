# Project Architecture

```
├── dist/                       # Compiled output (managed by Vite)
├── node_modules/
├── src/
│   ├── main/                   # Electron Main Process (Backend - Node.js environment)
│   │   ├── index.ts            # App entry point, creates BrowserWindow, app lifecycle
│   │   ├── preload.ts          # Context bridge for secure IPC
│   │   ├── ipcHandlers.ts      # Centralized handling of IPC events
│   │   └── services/           # OS interactions (e.g., FileSystemService, MenuService)
│   │
│   ├── renderer/               # Visual/interactive layer (Frontend - Browser environment)
│   │   ├── index.html
│   │   ├── index.ts            # Renderer entry point
│   │   ├── App.ts              # Root application controller/initializer
│   │   │
│   │   ├── assets/             # Static assets (textures, fonts)
│   │   │
│   │   ├── components/         # Reusable, generic PixiJS-based UI elements (agnostic of business logic)
│   │   │   └── common/         # Buttons, Sliders, Inputs
│   │   │
│   │   ├── engine/             # Core Rendering Logic (PixiJS/WebGPU Abstraction)
│   │   │   ├── RendererManager.ts # Initializes Pixi Application, WebGPU context, main loop
│   │   │   ├── SceneManager.ts    # Manages the root scene graph and view hierarchy
│   │   │   └── effects/           # TS wrappers for applying shaders/filters (Panel backgrounds)
│   │   │       └── NoiseEffect.ts
│   │   │
│   │   ├── features/           # Feature-specific organization (Panels)
│   │   │   ├── sidebar/        # Components and logic for the sidebar
│   │   │   │   └── SidebarPanel.ts
│   │   │   └── timeline/       # Complex timeline visualization components
│   │   │
│   │   ├── redux/              # Application State Management
│   │   │   ├── store.ts
│   │   │   └── slices/
│   │   │       ├── projectSlice.ts    # State for tasks, timelines, resources
│   │   │       └── uiSettingsSlice.ts # State for UI theme, panel visibility
│   │   │
│   │   ├── shaders/            # Raw Shader files (WGSL for WebGPU)
│   │   │   └── effects/
│   │   │       └── example.wgsl
│   │   │
│   │   ├── types/              # Renderer-specific types
│   │   └── utils/              # Helper functions
│   │
│   └── shared/                 # Code shared between Main and Renderer
│       ├── IpcContracts.ts     # Definitions of IPC channels and payloads
│       └── models/             # Shared data structures (e.g., ProjectFile)
│
├── .gitignore
├── package.json
├── tsconfig.json
└── electron.vite.config.ts
```

### Detailed Architecture Guide

#### 1\. `src/main/` (Electron Main Process - Backend)

This directory manages the application lifecycle, windows, and interactions with the operating system.

  * `index.ts`: The entry point. Handles app lifecycle events (ready, quit) and creates the main `BrowserWindow`.
  * `preload.ts`: **Crucial for security.** It uses `contextBridge` to selectively and securely expose APIs from the main process to the renderer.
  * `ipcHandlers.ts`: Centralizes `ipcMain.on` and `ipcMain.handle` logic, keeping `index.ts` clean.
  * `services/`: Encapsulates interactions with the OS, such as file I/O (e.g., `FileSystemService.ts` for saving/loading projects).

#### 2\. `src/renderer/` (The Visual Layer - Frontend)

This is where PixiJS, WebGPU, and Redux reside.

  * `App.ts`: The root controller. It initializes the Redux store, the `RendererManager`, and the `SceneManager`.
  * **`components/`**: Contains *only* reusable, generic UI elements (Buttons, Sliders, etc.).
      * **IMPORTANT:** These are PixiJS objects (e.g., classes extending `PIXI.Container`), not DOM elements. They should not be aware of the application's business logic.
  * **`features/`**: The core of the UI organization. Code is organized by application domain.
      * *Example:* `features/timeline/` contains the `TimelinePanel.ts` and any specific interaction handlers or selectors related to the timeline visualization. This replaces the previous `components/panels` directory.
  * **`engine/`**: Isolates the complex rendering logic from the UI components.
      * `RendererManager.ts`: A singleton responsible for initializing the `PIXI.Application`, enforcing the WebGPU backend, managing the canvas, handling resizing, and running the main render loop (ticker).
      * `SceneManager.ts`: Manages the hierarchy of the PixiJS scene graph. Handles adding/removing panels (features) and managing the layout.
      * `effects/`: TypeScript classes that wrap raw shaders. These classes handle loading the WGSL code, creating the necessary `PIXI.Shader` or `PIXI.Filter`, and managing uniforms (data passed from TypeScript to the GPU).
  * **`redux/`**: Global state management using Redux Toolkit.
  * **`shaders/`**: Contains the raw shader source code. Since the project *only* supports WebGPU, these files must be written in **WGSL** (WebGPU Shading Language).

#### 3\. `src/shared/`

Code accessible by both processes.

  * `IpcContracts.ts`: Defines constants for IPC channel names and the TypeScript interfaces for the data passed over those channels.
  * `models/`: Shared data structures (interfaces or classes).

### Key Workflow Explanations

#### 1\. Initialization and Enforcing WebGPU

The `RendererManager.ts` is responsible for starting PixiJS and ensuring the WebGPU requirement is met.

```typescript
// Example snippet in src/renderer/engine/RendererManager.ts (using PixiJS v8+)
import { Application, RendererType } from 'pixi.js';

export class RendererManager {
    public app: Application;

    public async initialize() {
        this.app = new Application();
        await this.app.init({
            preference: 'webgpu',
            // ... other options
        });

        // Enforce WebGPU
        if (this.app.renderer.type !== RendererType.WEBGPU) {
            // Handle the error appropriately (e.g., show a user-friendly error message)
            throw new Error("WebGPU is required but not supported or available.");
        }
        
        document.body.appendChild(this.app.canvas);
    }
}
```

#### 2\. Shader Effects Workflow

To implement a background effect for a panel:

1.  **Write the Shader:** Create the WGSL code in `src/renderer/shaders/effects/vibrant_bg.wgsl`.
2.  **Create the Wrapper:** Create `src/renderer/engine/effects/VibrantEffect.ts`. This class loads the WGSL source, defines uniforms (e.g., color, intensity), and creates a PixiJS Filter or Material.
3.  **Apply to Feature:** In `src/renderer/features/sidebar/SidebarPanel.ts`, instantiate the effect and apply it to the panel's background graphic or as a filter on the container.

#### 3\. Integrating Redux with PixiJS

PixiJS is an imperative rendering library; it does not automatically re-render when state changes like React does. You must manually connect PixiJS components (features) to the Redux store.

1.  **Subscription:** The PixiJS component (e.g., `TimelinePanel.ts`) must subscribe to the Redux store changes.
2.  **Update Logic:** When the state changes, the subscription callback must manually update the properties of the Pixi objects (position, color, visibility).

<!-- end list -->

```typescript
// Example snippet in src/renderer/features/timeline/TimelinePanel.ts
import * as PIXI from 'pixi.js';
import { store } from '../../redux/store';

class TimelinePanel extends PIXI.Container {
    private unsubscribe: () => void;
    private currentTasks: any[]; // Use appropriate types

    constructor() {
        super();
        // Initial state
        this.currentTasks = store.getState().project.tasks;
        // Subscribe to changes
        this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
        this.drawInitial();
    }

    onStateChange() {
        const newTasks = store.getState().project.tasks;

        // Optimization: Only update if the relevant state has actually changed
        if (newTasks !== this.currentTasks) {
            this.currentTasks = newTasks;
            this.updateVisualization();
        }
    }

    updateVisualization() {
        // Manually update the Pixi Graphics/Sprites based on this.currentTasks
    }

    destroy(options?: boolean | PIXI.IDestroyOptions) {
        // Clean up the subscription when the component is destroyed
        this.unsubscribe(); 
        super.destroy(options);
    }
}
```

#### 2\. Configure Bundler (Vite) for WGSL

WebGPU uses the WebGPU Shading Language (WGSL). You must configure your bundler (Electron Vite) to import `.wgsl` files as raw strings.

```typescript
// electron.vite.config.ts (or relevant Vite config)
import { defineConfig } from 'electron-vite';

export default defineConfig({
  // ... main, preload configs
  renderer: {
    // Ensure WGSL files are treated as assets to be loaded as strings
    assetsInclude: ['**/*.wgsl'],
    // ... other renderer configs
  }
});
```

#### 3\. TypeScript Configuration for WGSL

Inform TypeScript how to interpret `.wgsl` imports so they are treated as strings.

```typescript
// src/renderer/types/shims-wgsl.d.ts
declare module '*.wgsl' {
  const value: string;
  export default value;
}
```

### 1\. The Renderer Manager (Initialization and Enforcement)

The `RendererManager` is a singleton responsible for initializing the PixiJS `Application`, enforcing the strict WebGPU requirement, and managing the canvas lifecycle.

**`src/renderer/engine/RendererManager.ts`**

```typescript
import { Application, RendererType } from 'pixi.js';

class RendererManager {
    public app: Application;
    private initialized = false;

    constructor() {
        this.app = new Application();
    }

    public async initialize(containerElement: HTMLElement): Promise<boolean> {
        if (this.initialized) return true;

        try {
            await this.app.init({
                // Crucial: Request the WebGPU backend
                preference: 'webgpu',
                
                // Standard options for a UI application
                backgroundColor: 0x111111, 
                resizeTo: containerElement, // Automatically resize to fit the container
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,

                // Optimization: 2D UIs often don't need depth/stencil buffers
                depth: false,
                stencil: false,
            });

            // Enforce WebGPU requirement
            this.verifyWebGPU();

            // Attach the canvas to the DOM
            containerElement.appendChild(this.app.canvas);
            this.initialized = true;
            return true;

        } catch (error) {
            console.error("PixiJS Initialization failed:", error);
            this.displayCompatibilityError(containerElement);
            return false;
        }
    }

    private verifyWebGPU(): void {
        // PixiJS v8 returns RendererType.WEBGPU if successful
        if (this.app.renderer.type !== RendererType.WEBGPU) {
            throw new Error("WebGPU is strictly required but initialization failed or fallback occurred.");
        }
        console.log("PixiJS v8 WebGPU Renderer Initialized.");
    }

    private displayCompatibilityError(container: HTMLElement): void {
        // Provide user feedback if WebGPU is unavailable
        container.innerHTML = `
            <div style="padding: 20px; color: white; background: #330000; font-family: sans-serif;">
                <h1>Fatal Error: WebGPU Required</h1>
                <p>This application requires WebGPU, which is not supported or enabled in this environment.</p>
            </div>
        `;
    }
}

// Export a singleton instance
export const rendererManager = new RendererManager();
```

### 2\. The Scene Manager (Containers and Layout)

The `SceneManager` organizes the scene graph using `PIXI.Container`. Establishing layers is idiomatic for managing the Z-order of complex UIs.

**`src/renderer/engine/SceneManager.ts`**

```typescript
import { Container } from 'pixi.js';
import { rendererManager } from './RendererManager';

class SceneManager {
    // Define root-level layers (Containers)
    public readonly backgroundLayer = new Container();
    public readonly contentLayer = new Container(); // Timeline, Main area
    public readonly uiLayer = new Container();      // Sidebar, Header
    public readonly overlayLayer = new Container(); // Modals, Tooltips

    public initialize(): void {
        const stage = rendererManager.app.stage;

        // Add layers to the main stage in order (bottom to top)
        stage.addChild(
            this.backgroundLayer,
            this.contentLayer,
            this.uiLayer,
            this.overlayLayer
        );

        // Listen for resize events from the renderer to update the layout
        rendererManager.app.renderer.on('resize', this.onResize, this);
        
        // Perform initial layout
        const { width, height } = rendererManager.app.renderer.screen;
        this.onResize(width, height);
    }

    private onResize(width: number, height: number): void {
        // This function manages the positions and sizes of your main features.
        // It should notify the feature panels (e.g., SidebarPanel) to update their internal layouts.
        console.log(`Scene resized to: ${width}x${height}`);
        
        // Example (Assuming features are managed here or subscribed to this event):
        // this.sidebar.layout(250, height);
        // this.timeline.layout(width - 250, height);
        // this.timeline.position.x = 250;
    }
}

export const sceneManager = new SceneManager();
```

### 3\. Implementing WebGPU Shaders (WGSL) and Effects

To apply custom background effects, we use `PIXI.Filter`. Since the project is WebGPU-exclusive, shaders must be written in WGSL.

#### A. The WGSL Shader Code

We'll create a simple procedural noise shader. In PixiJS v8, filters typically expect all resources (custom uniforms, input texture, and sampler) to be bound within `@group(0)`.

**`src/renderer/shaders/effects/noise_bg.wgsl`**

```wgsl
// Define the structure for our custom uniforms
struct NoiseUniforms {
    uTime: f32,
    uIntensity: f32,
};

// --- PixiJS v8 Standard Filter Bindings (Group 0) ---

// Binding 0: Custom Uniforms (provided in the TS Filter definition)
@group(0) @binding(0) var<uniform> uniforms: NoiseUniforms;

// Binding 1 & 2: Input texture and sampler (provided automatically by Pixi Filter system)
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

// Input structure from the vertex shader (provided by Pixi)
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vTextureCoord: vec2<f32>,
};

// Simple pseudo-random function
fn random(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    // 1. Sample the original color of the container/graphic
    let originalColor = textureSample(uTexture, uSampler, in.vTextureCoord);

    // 2. Generate noise (adding time for subtle animation)
    // Scale coordinates slightly for better visual appearance
    let noise = random(in.vTextureCoord * 5.0 + uniforms.uTime * 0.05);

    // 3. Blend the noise
    // (noise - 0.5) centers the noise so it can darken or lighten the color
    let noiseEffect = (noise - 0.5) * uniforms.uIntensity;
    
    // Apply the effect, respecting the original alpha
    let finalColorRgb = originalColor.rgb + noiseEffect * originalColor.a;

    return vec4<f32>(clamp(finalColorRgb, vec3<f32>(0.0), vec3<f32>(1.0)), originalColor.a);
}
```

#### B. The TypeScript Filter Wrapper

We wrap the WGSL in a class extending `PIXI.Filter`. This class manages the `GpuProgram` and uniforms. It will also manage its own updates via the main ticker.

**`src/renderer/engine/effects/NoiseFilter.ts`**

```typescript
import { Filter, GlProgram, GpuProgram, IDestroyOptions } from 'pixi.js';
import { rendererManager } from '../RendererManager';

// Import the shader source code (handled by Vite configuration)
import noiseWgsl from '../../shaders/effects/noise_bg.wgsl';

export class NoiseFilter extends Filter {
    constructor(intensity: number = 0.1) {
        // 1. Create the GPU Program (WebGPU/WGSL)
        const gpuProgram = GpuProgram.from({
            // For standard filters, PixiJS provides a default vertex shader.
            vertex: {
                source: GpuProgram.defaultVertexSrc,
                entryPoint: 'mainVertex',
            },
            fragment: {
                source: noiseWgsl,
                entryPoint: 'fragmentMain',
            },
        });

        // 2. Provide a dummy GlProgram.
        // PixiJS v8 currently requires this for internal compatibility checks, 
        // even if only WebGPU is used.
        const glProgram = GlProgram.from({
            vertex: GlProgram.defaultVertexSrc,
            fragment: GlProgram.defaultFragmentSrc,
        });

        // 3. Initialize the Filter
        super({
            gpuProgram,
            glProgram,
            // Define the resources matching @group(0) @binding(0) in WGSL
            resources: {
                // The key 'uniforms' matches the WGSL variable name.
                uniforms: {
                    uTime: { value: 0, type: 'f32' },
                    uIntensity: { value: intensity, type: 'f32' },
                },
            },
        });

        // 4. Hook into the ticker for automatic updates
        this.startUpdates();
    }

    private startUpdates(): void {
        if (rendererManager.app && rendererManager.app.ticker) {
            rendererManager.app.ticker.add(this.updateTime, this);
        }
    }

    private updateTime(): void {
        // Update the time uniform using deltaTime for frame-rate independence
        const deltaTime = rendererManager.app.ticker.deltaTime;
        // Access the uniforms via the resources property
        this.resources.uniforms.uniforms.uTime += deltaTime * 0.01; // Adjust speed as needed
    }

    // Crucial: Clean up the ticker when the filter is destroyed
    public destroy(options?: boolean | IDestroyOptions): void {
        if (rendererManager.app && rendererManager.app.ticker) {
            rendererManager.app.ticker.remove(this.updateTime, this);
        }
        super.destroy(options);
    }
}
```

### 4\. Putting It Together (Application Entry and Usage)

Finally, we initialize the managers and demonstrate applying the filter to a feature panel.

**`src/renderer/features/sidebar/SidebarPanel.ts` (Example Panel)**

```typescript
import { Container, Graphics } from 'pixi.js';
import { NoiseFilter } from '../../engine/effects/NoiseFilter';

export class SidebarPanel extends Container {
    private background: Graphics;

    constructor() {
        super();
        this.background = new Graphics();
        this.addChild(this.background);

        // Initialize and apply the custom WebGPU shader effect
        // The filter manages its own updates automatically.
        const noiseFilter = new NoiseFilter(0.08);
        
        // Apply the filter to the entire container
        this.filters = [noiseFilter];
    }

    // Method called by SceneManager during layout updates
    public layout(width: number, height: number): void {
        // Draw the background visualization
        this.background.clear();
        this.background.rect(0, 0, width, height);
        // The base color that the shader will modify
        this.background.fill(0x333366); 
    }
}
```

**`src/renderer/App.ts` (Entry Point)**

```typescript
import { rendererManager } from './engine/RendererManager';
import { sceneManager } from './engine/SceneManager';
import { SidebarPanel } from './features/sidebar/SidebarPanel';

export class App {
    private sidebar: SidebarPanel;

    public async start() {
        // 1. Initialize the Renderer
        const rootContainer = document.getElementById('app'); // Assuming <div id="app"></div> in HTML
        if (!rootContainer) {
            throw new Error("Root container element not found.");
        }
        
        const initialized = await rendererManager.initialize(rootContainer);

        // If initialization failed (e.g., WebGPU not supported), stop here.
        if (!initialized) return;

        // 2. Initialize the Scene Graph structure
        sceneManager.initialize();

        // 3. Create and add feature panels
        this.setupPanels();
    }

    private setupPanels(): void {
        this.sidebar = new SidebarPanel();
        // Add the panel to the appropriate layer
        sceneManager.uiLayer.addChild(this.sidebar);

        // Trigger initial layout for the sidebar (SceneManager would typically handle this dynamically)
        const { height } = rendererManager.app.renderer.screen;
        this.sidebar.layout(250, height);
    }
}
```