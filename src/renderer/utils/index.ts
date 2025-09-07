export { TIMELINE_CONFIG } from '../timelineConfig'
export { DAY_THRESHOLD, HOUR_THRESHOLD } from '../timeScale'
export type { TimeScale } from '../timeScale'
export { computeDateHeaderHeight, computeDateHeaderViewModel }
    from '../dateHeader'
export {
    TIMELINE,
    clampZoom,
    pixelsPerDay,
    worldDaysToScreenX,
    screenXToWorldDays,
    applyAnchorZoom,
    dayIndexFromISO,
    isoFromDayIndex,
    computeScaledTimeline,
    staffCenterY,
    EPS,
    nearlyZero,
} from '../timelineMath'
