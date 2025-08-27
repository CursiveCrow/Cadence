import { Container, Graphics, Text } from 'pixi.js'
import { RendererPlugin, registerRendererPlugin } from '../scene'
import { STATUS_TO_ACCIDENTAL, TIMELINE_CONFIG } from '../config'

/**
 * StatusGlyphPlugin
 * Draws a small status glyph (accidental) overlay at the left of each task container.
 */
export const StatusGlyphPlugin: RendererPlugin = {
    onTaskUpserted: (_taskId: string, container: Container) => {
        try {
            // Clean previous overlay
            const prev = (container as any).__statusGlyph as Graphics | Text | undefined
            if (prev && container.children.includes(prev)) {
                container.removeChild(prev)
            }

            const meta = (container as any).__meta as { status?: string; width?: number } | undefined
            if (!meta) return

            const status = meta.status || 'default'
            const accidental = STATUS_TO_ACCIDENTAL[status]
            if (!accidental) return

            // Oversample the text and then scale down to reduce subpixel blur
            const oversample = 1.5
            const baseFont = status === 'cancelled' ? 18 : 16
            const t = new Text({
                text: accidental,
                style: {
                    fontFamily: 'serif',
                    fontSize: baseFont * oversample,
                    fontWeight: 'bold',
                    fill: 0xffffff,
                    align: 'center'
                }
            })
            // Boost text resolution proportionally to device pixel ratio and current zoom
            const viewport = container.parent?.parent as Container | undefined
            const scaleX = viewport?.scale?.x ?? 1
            const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1
            const desiredRes = Math.min(4, Math.max(1, dpr * scaleX * oversample))
                ; (t as any).resolution = desiredRes
            if (typeof (t as any).updateText === 'function') {
                try { (t as any).updateText() } catch { }
            }
            // Center inside the left circular part of the note body
            const r = TIMELINE_CONFIG.TASK_HEIGHT / 2
            // Downsample to reduce subpixel artifacts
            t.scale.set(1 / oversample)
            // Snap to integer pixels to avoid shimmering
            t.x = Math.round(r - t.width / 2)
            t.y = Math.round((TIMELINE_CONFIG.TASK_HEIGHT / 2) - t.height / 2)
            container.addChild(t)
                ; (container as any).__statusGlyph = t
        } catch { }
    }
}

// Auto-register on import so consumers can just import this module to activate
registerRendererPlugin(StatusGlyphPlugin)
