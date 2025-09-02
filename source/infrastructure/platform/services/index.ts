/**
 * Interfaces/implementations for FS access, dialogs (Electron IPC/Web APIs)
 * Based on Design.md specification
 */

export * from './interfaces'
// Do not re-export concrete implementations to avoid leaking platform-specific APIs

// React provider for PlatformServices
import React from 'react'
import type { PlatformServices } from './interfaces'
import { ElectronPlatformServices } from './electron'
import { WebPlatformServices } from './web'

export const PlatformServicesContext = React.createContext<PlatformServices | null>(null)

export function createPlatformServices(): PlatformServices | null {
  try {
    // Presence of window.api indicates Electron via preload; avoid process.versions checks in renderer
    if (typeof window !== 'undefined' && (window as any).api) {
      return new ElectronPlatformServices()
    }
    return new WebPlatformServices()
  } catch {
    return null
  }
}

