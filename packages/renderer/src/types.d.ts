/**
 * Type declarations for PixiJS OffscreenCanvas integration (v8)
 */

declare module 'pixi.js' {
  interface ApplicationOptions {
    canvas?: HTMLCanvasElement | OffscreenCanvas
  }
}

export {}
