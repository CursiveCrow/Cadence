export const DAY_THRESHOLD = 0.75
export const HOUR_THRESHOLD = 2

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * Compute the hierarchical date header height based on zoom.
 * Base band (months): 32px
 * Days band slides in after DAY_THRESHOLD up to +24px
 * Hours band slides in after HOUR_THRESHOLD up to +20px
 */
export function computeDateHeaderHeight(zoom: number): number {
    const base = 32
    const dayBand = 24
    const hourBand = 24
    const daysProg = clamp((zoom - DAY_THRESHOLD) / 0.25, 0, 1)
    const hoursProg = clamp((zoom - HOUR_THRESHOLD) / 0.5, 0, 1)
    // Smooth, continuous growth to avoid snap when bands appear
    return Math.round(base + dayBand * daysProg + hourBand * hoursProg)
}


