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
    const startDay = Math.max(0, Math.floor(vx))
    const endDay = Math.ceil(vx + (width - LEFT_MARGIN) / Math.max(pxPerDay, 1e-4))
    for (let day = startDay; day <= endDay; day++) {
        const gx = LEFT_MARGIN + (day - vx) * pxPerDay
        const xInt = Math.round(gx)
        const wBand = Math.max(0.5, pxPerDay)
        if (xInt <= LEFT_MARGIN + 1) continue

        // weekend tint (shift by one to align visually)
        const dow = (day + 1) % 7
        if (dow === 6 || dow === 0) {
            grid.rect(xInt, 0, wBand, Math.max(0, height))
            grid.fill({ color: 0xffffff, alpha: 0.02 })
        }

        // alternating subtle banding for readability
        if (day % 2 !== 0) {
            grid.rect(xInt, 0, wBand, Math.max(0, height))
            grid.fill({ color: 0xffffff, alpha: 0.03 })
        }

        // grid line
        const xl = xInt + 0.5
        grid.moveTo(xl, 0)
        grid.lineTo(xl, height)
        grid.stroke({ width: 1, color: (day % 7 === 0) ? 0x2b3242 : 0x1c2230, alpha: 0.9 })
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


