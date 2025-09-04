import { Graphics } from 'pixi.js'

export function drawGridBackground(params: {
    width: number
    height: number
    LEFT_MARGIN: number
    pxPerDay: number
    viewportXDays: number
}): Graphics[] {
    const { width, height, LEFT_MARGIN, pxPerDay, viewportXDays } = params
    const nodes: Graphics[] = []

    const grid = new Graphics()
    const vx = viewportXDays
    const gridStartWorld = Math.max(0, Math.floor(vx))
    const gridEndWorld = Math.ceil(vx + (width - LEFT_MARGIN) / pxPerDay)
    for (let day = gridStartWorld; day <= gridEndWorld; day++) {
        const gx = LEFT_MARGIN + (day - vx) * pxPerDay
        // weekend tint (approximation: shift by one to align weeks visually)
        const dow = (day + 1) % 7
        if (dow === 6 || dow === 0) {
            const xBand2 = Math.round(gx)
            const wBand2 = Math.max(0.5, pxPerDay)
            if (xBand2 > LEFT_MARGIN + 1) {
                grid.rect(xBand2, 0, wBand2, Math.max(0, height))
                grid.fill({ color: 0xffffff, alpha: 0.02 })
            }
        }
        if (day % 2 !== 0) {
            const xBand = Math.round(gx)
            const wBand = Math.max(0.5, pxPerDay)
            if (xBand > LEFT_MARGIN + 1) {
                grid.rect(xBand, 0, wBand, Math.max(0, height))
                grid.fill({ color: 0xffffff, alpha: 0.03 })
            }
        }
        if (gx > LEFT_MARGIN + 1) {
            grid.moveTo(Math.round(gx) + 0.5, 0)
            grid.lineTo(Math.round(gx) + 0.5, height)
            grid.stroke({ width: 1, color: (day % 7 === 0) ? 0x2b3242 : 0x1c2230, alpha: 0.9 })
        }
    }
    nodes.push(grid)
    return nodes
}

export function drawStaffLines(params: {
    width: number
    LEFT_MARGIN: number
    yTop: number
    lineSpacing: number
    lines: number
}): Graphics {
    const { width, LEFT_MARGIN, yTop, lineSpacing, lines } = params
    const s = new Graphics()
    for (let i = 0; i < lines; i++) {
        const ly = yTop + i * lineSpacing
        s.moveTo(LEFT_MARGIN, Math.round(ly) + 0.5)
        s.lineTo(width, Math.round(ly) + 0.5)
        s.stroke({ width: 1, color: 0x2b3242, alpha: 0.8 })
    }
    return s
}


