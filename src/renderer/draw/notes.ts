import { Graphics, Text } from 'pixi.js'

export function statusToColor(status: string): number {
    switch (status) {
        case 'in_progress':
            return 0x3B82F6
        case 'completed':
            return 0x10B981
        case 'blocked':
            return 0xEF4444
        case 'cancelled':
            return 0x9CA3AF
        case 'not_started':
        default:
            return 0x6B7280
    }
}

export function drawNoteHeadAndLine(params: {
    x: number
    yTop: number
    width: number
    height: number
    color: number
    selected?: boolean
    pxPerDay: number
}): Graphics {
    const { x, yTop, width, height, color, selected, pxPerDay } = params
    const g = new Graphics()
    const radius = Math.max(4, Math.floor(height / 2))
    const centerY = yTop + radius
    const headX = x + radius

    const trackStart = Math.round(headX + 4)
    const trackEnd = Math.round(x + width - 2)
    if (trackEnd > trackStart) {
        const trackW = Math.max(1, trackEnd - trackStart)
        const trackY = Math.round(centerY - 1)
        g.rect(trackStart, trackY, trackW, 2)
        g.fill({ color: 0x000000, alpha: 0.25 })
        g.rect(trackStart, trackY, trackW, 2)
        g.fill({ color, alpha: 0.35 })
        g.circle(trackEnd, centerY, 2)
        g.fill({ color, alpha: 0.9 })
        const durationDays = Math.max(1, Math.round(width / Math.max(1, pxPerDay)))
        for (let k = 1; k < durationDays; k++) {
            const tx = Math.round(x + k * Math.max(1, pxPerDay))
            if (tx > trackStart && tx < trackEnd) {
                g.moveTo(tx + 0.5, centerY - 3)
                g.lineTo(tx + 0.5, centerY + 3)
                g.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
            }
        }
    }

    g.circle(headX, centerY, radius)
    g.fill({ color, alpha: 0.95 })
    g.stroke({ width: selected ? 2 : 1, color: selected ? 0xFCD34D : 0xffffff, alpha: selected ? 1 : 0.3 })
    g.circle(headX, centerY, Math.max(2, radius - 2))
    g.fill({ color: 0xffffff, alpha: 0.25 })
    return g
}

export function drawLabelWithMast(params: {
    xLeft: number
    yTop: number
    h: number
    text: string
    headColor: number
    width: number
    height: number
}): { nodes: (Graphics | Text)[]; box: { x: number; y: number; w: number; h: number } } {
    const { xLeft, yTop, h, text, headColor, width, height } = params
    const nodes: (Graphics | Text)[] = []
    const title = new Text({ text, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 10, fill: 0xffffff } })
    const padX = 6
    const padY = 2
    const pillW = Math.round(title.width + padX * 2)
    const pillH = Math.round(title.height + padY * 2)
    const desiredX = Math.round(xLeft + h + 12)
    const desiredY = Math.round(yTop - pillH - 8)
    const labelX = Math.max(0 + 2, Math.min(width - pillW - 2, desiredX))
    const labelY = Math.max(2, Math.min(height - pillH - 2, desiredY))
    const fx0 = Math.round(labelX - padX)
    const labelTop = Math.round(labelY - padY)
    const labelBottom = labelTop + pillH

    const stemStartX = Math.round(xLeft + h - 1)
    const stemStartY = Math.round(yTop + h / 2 - Math.max(3, Math.floor(h * 0.2)))
    const vX = fx0 - stemStartX
    const vY = labelTop - stemStartY
    let bottomLeftX = fx0
    if (Math.abs(vY) > 0.0001) {
        const k = (labelBottom - labelTop) / vY
        bottomLeftX = Math.round(fx0 + k * vX)
    }

    const gBox = new Graphics()
    gBox.beginPath()
    gBox.moveTo(fx0, labelTop)
    gBox.lineTo(fx0 + pillW, labelTop)
    gBox.lineTo(fx0 + pillW, labelBottom)
    gBox.lineTo(bottomLeftX, labelBottom)
    gBox.closePath()
    gBox.fill({ color: 0x000000, alpha: 0.25 })
    nodes.push(gBox)

    const mast = new Graphics()
    mast.moveTo(stemStartX, stemStartY)
    mast.lineTo(fx0, labelTop)
    mast.stroke({ width: 2, color: headColor, alpha: 0.95 })
    nodes.push(mast)

    title.x = Math.round(labelX)
    title.y = Math.round(labelY)
    nodes.push(title)

    return { nodes, box: { x: fx0, y: labelTop, w: pillW, h: pillH } }
}


