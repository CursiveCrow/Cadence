import { TIMELINE } from '../../shared/timeline'

// TIMELINE constants are provided from shared; keep functions pure and accept params

// Removed legacy 2D-canvas DPR helper; Pixi handles resolution internally.

// Math helpers kept deliberately simple and consistent across the app

export function clampZoom(z: number): number {
    return Math.max(0.1, Math.min(20, z || 1))
}

export function pixelsPerDay(zoom: number, dayWidth: number = TIMELINE.DAY_WIDTH): number {
    return dayWidth * Math.max(0.1, zoom || 1)
}

export function worldDaysToScreenX(
    dayIndex: number,
    viewport: { x: number; zoom: number },
    leftMargin: number,
    dayWidth: number = TIMELINE.DAY_WIDTH
): number {
    const ppd = pixelsPerDay(viewport.zoom, dayWidth)
    return leftMargin + (dayIndex - (viewport.x || 0)) * ppd
}

export function screenXToWorldDays(
    localX: number,
    viewport: { x: number; zoom: number },
    leftMargin: number,
    dayWidth: number = TIMELINE.DAY_WIDTH
): number {
    const ppd = pixelsPerDay(viewport.zoom, dayWidth)
    const anchorPxFromGrid = Math.max(0, localX - leftMargin)
    return Math.max(0, (viewport.x || 0) + anchorPxFromGrid / Math.max(ppd, EPS))
}

export function applyAnchorZoom(
    viewport: { x: number; y: number; zoom: number },
    newZoom: number,
    anchorLocalX: number,
    leftMargin: number,
    dayWidth: number = TIMELINE.DAY_WIDTH
): { x: number; y: number; zoom: number } {
    const z0 = viewport.zoom || 1
    const z1 = clampZoom(newZoom)
    const ppd0 = pixelsPerDay(z0, dayWidth)
    const ppd1 = pixelsPerDay(z1, dayWidth)
    const anchorPxFromGrid = Math.max(0, anchorLocalX - leftMargin)
    const worldAtAnchor = (viewport.x || 0) + anchorPxFromGrid / Math.max(ppd0, EPS)
    const newX = Math.max(0, worldAtAnchor - anchorPxFromGrid / Math.max(ppd1, EPS))
    return { x: newX, y: viewport.y, zoom: z1 }
}

export function dayIndexFromISO(iso: string, projectStart: Date): number {
    const base = Date.UTC(
        projectStart.getUTCFullYear(),
        projectStart.getUTCMonth(),
        projectStart.getUTCDate()
    )
    const p = iso.split('-').map(Number)
    if (p.length !== 3 || Number.isNaN(p[0]!)) return 0
    const d = Date.UTC(p[0]!, (p[1]! - 1), p[2]!)
    return Math.max(0, Math.round((d - base) / (24 * 3600 * 1000)))
}

export function isoFromDayIndex(dayIndex: number, projectStart: Date): string {
    const base = Date.UTC(
        projectStart.getUTCFullYear(),
        projectStart.getUTCMonth(),
        projectStart.getUTCDate()
    )
    const ms = base + Math.max(0, Math.round(dayIndex)) * 24 * 3600 * 1000
    const d = new Date(ms)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

// Small numeric tolerance helpers
export const EPS = 1e-4
export function nearlyZero(value: number, eps: number = EPS): boolean {
    return Math.abs(value) <= eps
}

// Staff geometry helpers
export function computeScaledTimeline(scale: number) {
    const s = Math.max(0.5, Math.min(3, scale || 1))
    const topMargin = Math.round(TIMELINE.TOP_MARGIN * s)
    const staffSpacing = Math.max(20, Math.round(TIMELINE.STAFF_SPACING * s))
    const lineSpacing = Math.max(8, Math.round(TIMELINE.STAFF_LINE_SPACING * s))
    return { topMargin, staffSpacing, lineSpacing }
}

export function staffCenterY(yTop: number, staffLine: number, lineSpacing: number): number {
    return yTop + staffLine * (lineSpacing / 2)
}
