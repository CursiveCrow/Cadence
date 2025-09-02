/**
 * Interfaces/implementations for FS access, dialogs (Electron IPC/Web APIs)
 * Based on Design.md specification
 */

export * from './interfaces'
// SRP: only export interfaces and factory from infrastructure; React context is in surface
export { createPlatformServices } from './factory'

