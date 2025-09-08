import { isDevEnvironment } from '@cadence/config'

type Viewport = { x: number; y: number; zoom: number }

export const DebugService = {
    setViewport(viewport: Viewport): void {
        if (!isDevEnvironment()) return
        try {
            const fn = (window as any).__CADENCE_SET_VIEWPORT
            if (typeof fn === 'function') fn(viewport)
        } catch { }
    },
    setVerticalScale(scale: number): void {
        if (!isDevEnvironment()) return
        try {
            const fn = (window as any).__CADENCE_SET_VERTICAL_SCALE
            if (typeof fn === 'function') fn(scale)
        } catch { }
    },
    getLastSelectPos(): { x: number; y: number } | undefined {
        if (!isDevEnvironment()) return undefined
        try {
            return (window as any).__CADENCE_LAST_SELECT_POS
        } catch { }
        return undefined
    }
}


