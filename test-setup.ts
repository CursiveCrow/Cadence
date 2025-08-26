/**
 * Jest Test Setup
 * Global configuration for all tests
 */

import '@testing-library/jest-dom';

// Mock HTMLCanvasElement and OffscreenCanvas for renderer tests
global.HTMLCanvasElement = class HTMLCanvasElement {
  getContext() {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: [] })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: [] })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      transform: jest.fn(),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      shadowColor: 'transparent',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      measureText: jest.fn(() => ({ width: 0 })),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      bezierCurveTo: jest.fn(),
      arc: jest.fn(),
      arcTo: jest.fn(),
      rect: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      clip: jest.fn(),
      isPointInPath: jest.fn()
    };
  }
  transferControlToOffscreen() {
    return {
      getContext: this.getContext,
      width: 800,
      height: 600
    };
  }
  width = 800;
  height = 600;
} as any;

global.OffscreenCanvas = class OffscreenCanvas {
  constructor(public width: number = 800, public height: number = 600) {}
  getContext() {
    return global.HTMLCanvasElement.prototype.getContext();
  }
} as any;

// Mock Web Workers
global.Worker = class Worker {
  onmessage = jest.fn();
  onerror = jest.fn();
  postMessage = jest.fn();
  terminate = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
} as any;

// Mock URL.createObjectURL for worker creation
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');

// Mock navigator.storage for OPFS tests
Object.defineProperty(navigator, 'storage', {
  value: {
    getDirectory: jest.fn().mockResolvedValue({
      getFileHandle: jest.fn().mockResolvedValue({
        createWritable: jest.fn().mockResolvedValue({
          write: jest.fn(),
          close: jest.fn()
        })
      })
    })
  },
  configurable: true
});

// Mock CompressionStream and DecompressionStream
global.CompressionStream = class CompressionStream {
  constructor(public format: string) {}
  readable = {
    getReader: jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ value: new Uint8Array(), done: true })
    }))
  };
  writable = {
    getWriter: jest.fn(() => ({
      write: jest.fn(),
      close: jest.fn()
    }))
  };
} as any;

global.DecompressionStream = global.CompressionStream;

// Suppress console errors/warnings during tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Warning') || 
       args[0].includes('act()') ||
       args[0].includes('React'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('deprecated')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
