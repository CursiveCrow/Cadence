/**
 * Alignment utilities shared across renderer and surface layers
 * Mirrors the archive's quantized viewport alignment to ensure
 * pixel-perfect agreement between the canvas grid and date header.
 */

export interface BasicTimelineConfig {
    LEFT_MARGIN: number
    DAY_WIDTH: number
}

export interface ViewportAlignment {
    viewportXDaysQuantized: number
    viewportPixelOffsetX: number
}

/**
 * Quantize viewport X (in world days) into pixel-aligned units.
 * This prevents sub-pixel drift of grid lines/ticks when panning/zooming.
 */
export function computeViewportAlignment(
    config: BasicTimelineConfig,
    viewportXDays: number
): ViewportAlignment {
    const dayWidth = Math.max(config.DAY_WIDTH, 0.0001)
    const pixel = Math.round((viewportXDays || 0) * dayWidth)
    const viewportPixelOffsetX = -pixel
    const viewportXDaysQuantized = pixel / dayWidth
    return { viewportXDaysQuantized, viewportPixelOffsetX }
}

/**
 * Convert a world day index (days since project start) into a screen X
 * position using the quantized alignment.
 */
export function worldDayToScreenX(
    config: BasicTimelineConfig,
    dayIndex: number,
    align: ViewportAlignment
): number {
    return config.LEFT_MARGIN + (dayIndex - align.viewportXDaysQuantized) * config.DAY_WIDTH
}

/**
 * Compute an inclusive day index range that covers the visible screen with
 * some padding to avoid label popping at edges.
 */
export function getVisibleDayRange(
    config: BasicTimelineConfig,
    screenWidth: number,
    align: ViewportAlignment,
    paddingDays: number = 5
): { from: number; to: number } {
    const dayWidth = Math.max(config.DAY_WIDTH, 0.0001)
    const leftMostDays = Math.floor(align.viewportXDaysQuantized - config.LEFT_MARGIN / dayWidth)
    const visibleDays = Math.ceil(screenWidth / dayWidth)
    return { from: leftMostDays - paddingDays, to: leftMostDays + visibleDays + paddingDays }
}


