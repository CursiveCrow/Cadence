import { Graphics } from 'pixi.js'
import { getCssVarColor } from '../../shared/colors'

export function drawTodayMarker(x: number, height: number): Graphics {
    const line = new Graphics()
    line.moveTo(Math.round(x) + 0.5, 0)
    line.lineTo(Math.round(x) + 0.5, Math.max(0, height))
    const accent = getCssVarColor('--ui-color-accent', 0xF59E0B)
    line.stroke({ width: 2, color: accent, alpha: 0.9 })
    return line
}

export function drawMeasurePair(xThick: number, xThin: number, yTop: number, yBottom: number): Graphics {
    const g = new Graphics()
    g.moveTo(xThick, yTop)
    g.lineTo(xThick, yBottom)
    const major = getCssVarColor('--ui-grid-major', 0xffffff)
    const minor = getCssVarColor('--ui-grid-minor', 0xffffff)
    g.stroke({ width: 3, color: major, alpha: 0.35 })
    g.moveTo(xThin, yTop)
    g.lineTo(xThin, yBottom)
    g.stroke({ width: 1, color: minor, alpha: 0.25 })
    return g
}

