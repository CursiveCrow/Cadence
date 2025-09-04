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
    const radius = Math.max(2, Math.floor(height / 2))
    const centerY = yTop + radius
    const headX = x + radius

    // duration track behind the head with faint ledger ticks
    const trackY = Math.round(centerY - 1)
    const trackStart = Math.round(headX + 4)
    const trackEnd = Math.round(x + width - 2)
    if (trackEnd > trackStart) {
        const trackW = Math.max(1, trackEnd - trackStart)
        g.rect(trackStart, trackY - 1, trackW, 3)
        g.fill({ color: 0x000000, alpha: 0.24 })
        g.rect(trackStart, trackY - 1, trackW, 3)
        g.fill({ color, alpha: 0.35 })
        g.circle(trackEnd, centerY, 2)
        g.fill({ color, alpha: 0.95 })
        const days = Math.max(1, Math.round(width / Math.max(pxPerDay, 1)))
        const step = Math.max(pxPerDay, 1)
        for (let k = 1; k < days; k++) {
            const tx = Math.round(x + k * step)
            if (tx > trackStart && tx < trackEnd) {
                g.moveTo(tx + 0.5, centerY - 3)
                g.lineTo(tx + 0.5, centerY + 3)
                g.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
            }
        }
    }

    // head with glossy highlight and subtle shadow ring
    g.circle(headX, centerY, radius)
    g.fill({ color, alpha: 0.98 })
    g.stroke({ width: selected ? 2 : 1, color: selected ? 0xFCD34D : 0xffffff, alpha: selected ? 1 : 0.35 })
    g.circle(headX - Math.max(1, Math.floor(radius * 0.15)), centerY - Math.max(1, Math.floor(radius * 0.15)), Math.max(2, radius - 3))
    g.fill({ color: 0xffffff, alpha: 0.22 })
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
    const title = new Text({ text, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 10, fill: headColor } })
    const padX = 6
    const padY = 2
    const pillW = Math.round(title.width + padX * 2)
    const pillH = Math.round(title.height + padY * 2)
    const labelX = Math.max(2, Math.min(width - pillW - 2, Math.round(xLeft + h + 10)))
    const labelY = Math.max(2, Math.min(height - pillH - 2, Math.round(yTop - pillH - 1)))
    const boxX = Math.round(labelX - padX)
    const boxY = Math.round(labelY - padY)

    // Slanted left edge aligned to stem angle; bottom-left corner lies on the mast line
    const eps = 1e-4
    const labelTop = boxY
    const labelBottom = boxY + pillH
    const stemStartX = Math.round(xLeft + h - 1)
    const stemStartY = Math.round(yTop + h / 2)
    const vX = boxX - stemStartX
    const vY = labelTop - stemStartY
    const k = Math.abs(vY) > eps ? (labelBottom - labelTop) / vY : 0
    const bottomLeftX = Math.round(boxX + k * vX)

    // polygon with slanted left edge (top-left -> top-right -> bottom-right -> bottom-left)
    const gBox = new Graphics()
    gBox.beginPath()
    gBox.moveTo(boxX, labelTop)
    gBox.lineTo(boxX + pillW, labelTop)
    gBox.lineTo(boxX + pillW, labelBottom)
    gBox.lineTo(bottomLeftX, labelBottom)
    gBox.closePath()
    gBox.fill({ color: 0x000000, alpha: 0.28 })
    gBox.stroke({ width: 1, color: headColor, alpha: 0.75 })
    nodes.push(gBox)

    // Mast goes to top-left corner; left edge remains aligned via bottomLeftX computation
    const mast = new Graphics()
    mast.moveTo(stemStartX, stemStartY)
    mast.lineTo(boxX, labelTop)
    mast.stroke({ width: 2, color: headColor, alpha: 0.95 })
    nodes.push(mast)

    title.x = Math.round(labelX)
    title.y = Math.round(labelY)
    nodes.push(title)

    return { nodes, box: { x: boxX, y: boxY, w: pillW, h: pillH } }
}


