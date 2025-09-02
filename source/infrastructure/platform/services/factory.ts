import { ElectronPlatformServices } from './electron'
import { WebPlatformServices } from './web'
import type { PlatformServices } from './interfaces'

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


