import { Container, Text } from 'pixi.js'
import { RendererPlugin } from '../scene'
import { STATUS_TO_ACCIDENTAL } from '../config'
import { computeTextResolution } from '../resolution'
import { devLog, safeCall } from '../devlog'

/**
 * StatusGlyphPlugin
 * Draws a small status glyph (accidental) overlay at the left of each task container.
 */
export const StatusGlyphPlugin: RendererPlugin = {
    onTaskUpserted: (_task, container: Container, ctx) => {
        try {
            const prev = (container as any).__statusGlyph as Text | undefined
            if (prev && container.children.includes(prev)) {
                container.removeChild(prev)
            }
            const status = (_task as any).status || 'default'
            const accidental = STATUS_TO_ACCIDENTAL[status]
            if (!accidental) return
            const oversample = 1.5
            const baseFont = status === 'cancelled' ? Math.max(10, Math.round(ctx.config.TASK_HEIGHT * 0.72)) : Math.max(10, Math.round(ctx.config.TASK_HEIGHT * 0.64))
            const t = new Text({
                text: accidental,
                style: { fontFamily: 'serif', fontSize: baseFont * oversample, fontWeight: 'bold', fill: 0xffffff, align: 'center' }
            })
            const viewport = container.parent?.parent as Container | undefined
            const scaleX = viewport?.scale?.x ?? 1
            const desiredRes = computeTextResolution(scaleX, oversample)
                ; (t as any).resolution = desiredRes
            safeCall('status-glyph updateText failed', () => { (t as any).updateText?.() })
            const r = ctx.config.TASK_HEIGHT / 2
            t.scale.set(1 / oversample)
            t.x = Math.round(r - t.width / 2)
            t.y = Math.round((ctx.config.TASK_HEIGHT / 2) - t.height / 2)
            container.addChild(t)
                ; (container as any).__statusGlyph = t
        } catch (err) { devLog.warn('StatusGlyphPlugin.onTaskUpserted failed', err) }
    }
}
