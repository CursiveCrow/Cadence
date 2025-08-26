/**
 * Type declarations for PixiJS OffscreenCanvas integration
 */

declare module 'pixi.js' {
  namespace PIXI {
    interface ApplicationOptions {
      canvas?: HTMLCanvasElement | OffscreenCanvas;
    }
  }
}

// Extend global types for Web Workers
declare global {
  interface Worker {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}
