export * from './interfaces'

import React from 'react'
import type { PlatformServices } from './interfaces'
import { ElectronPlatformServices } from './electron'
import { WebPlatformServices } from './web'

export const PlatformServicesContext = React.createContext<PlatformServices | null>(null)

export function createPlatformServices(): PlatformServices | null {
  try {
    if (typeof window !== 'undefined' && (window as any).api) {
      return new ElectronPlatformServices()
    }
    return new WebPlatformServices()
  } catch {
    return null
  }
}

export function usePlatformServices(): PlatformServices {
  const ctx = React.useContext(PlatformServicesContext)
  if (!ctx) throw new Error('PlatformServicesContext not provided')
  return ctx
}

