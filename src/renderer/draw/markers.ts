import { Graphics } from 'pixi.js'

export function drawTodayMarker(x: number, height: number): Graphics {
    const line = new Graphics()
    line.moveTo(Math.round(x) + 0.5, 0)
    line.lineTo(Math.round(x) + 0.5, Math.max(0, height))
    line.stroke({ width: 2, color: 0xF59E0B, alpha: 0.9 })
    return line
}

export function drawMeasurePair(xThick: number, xThin: number, yTop: number, yBottom: number): Graphics {
    const g = new Graphics()
    g.moveTo(xThick, yTop)
    g.lineTo(xThick, yBottom)
    g.stroke({ width: 3, color: 0xffffff, alpha: 0.35 })
    g.moveTo(xThin, yTop)
    g.lineTo(xThin, yBottom)
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.25 })
    return g
}


