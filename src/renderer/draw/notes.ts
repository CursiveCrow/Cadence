import { Graphics, Text, BlurFilter } from 'pixi.js'

export function statusToColor(status: string): number {
    switch (status) {
        case 'in_progress':
            return 0x2563EB // Bright blue
        case 'completed':
            return 0x22C55E // Vibrant green
        case 'blocked':
            return 0xEF4444 // Red
        case 'cancelled':
            return 0x6B7280 // Gray
        case 'not_started':
        default:
            return 0xA855F7 // Purple (musical note default)
    }
}

export function statusToGlowColor(status: string): number {
    switch (status) {
        case 'in_progress':
            return 0x60A5FA // Light blue glow
        case 'completed':
            return 0x86EFAC // Light green glow
        case 'blocked':
            return 0xFCA5A5 // Light red glow
        case 'cancelled':
            return 0x9CA3AF // Light gray
        case 'not_started':
        default:
            return 0xC084FC // Light purple glow
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
    status?: string
}): Graphics {
    const { x, yTop, width, height, color, selected, pxPerDay, status = 'not_started' } = params
    const g = new Graphics()
    const radius = Math.max(7, Math.floor(height * 0.45)) // Better proportions
    const centerY = yTop + height / 2
    const headX = x + radius + 2
    const glowColor = statusToGlowColor(status)

    // Duration track - clean and modern
    const trackY = Math.round(centerY)
    const trackStart = Math.round(headX + radius + 3)
    const trackEnd = Math.round(x + width - 3)

    if (trackEnd > trackStart) {
        const trackW = Math.max(1, trackEnd - trackStart)

        // Track shadow for depth
        g.rect(trackStart, trackY - 1, trackW, 3)
        g.fill({ color: 0x000000, alpha: 0.2 })

        // Main duration track
        g.rect(trackStart, trackY - 1, trackW, 2)
        g.fill({ color, alpha: 0.5 })

        // Track highlight
        g.rect(trackStart, trackY - 1, Math.min(trackW * 0.3, 20), 1)
        g.fill({ color: 0xffffff, alpha: 0.3 })

        // End marker
        g.circle(trackEnd, centerY, 2)
        g.fill({ color, alpha: 0.8 })

        // Day tick marks - subtle
        const days = Math.max(1, Math.round(width / Math.max(pxPerDay, 1)))
        if (pxPerDay > 30) { // Only show when zoomed in enough
            for (let k = 1; k < days; k++) {
                const tx = Math.round(x + k * pxPerDay)
                if (tx > trackStart + 5 && tx < trackEnd - 5) {
                    g.rect(tx, centerY - 2, 1, 4)
                    g.fill({ color: 0xffffff, alpha: 0.15 })
                }
            }
        }
    }

    // Note head - clean and musical

    // Selection glow effect
    if (selected) {
        // Outer glow
        for (let i = 3; i > 0; i--) {
            g.circle(headX, centerY, radius + i * 2)
            g.fill({ color: 0xFACC15, alpha: 0.08 * (4 - i) })
        }
    }

    // Drop shadow for depth
    g.circle(headX + 1, centerY + 1, radius)
    g.fill({ color: 0x000000, alpha: 0.25 })

    // Main note head - perfectly round
    g.circle(headX, centerY, radius)
    g.fill({ color, alpha: 1 })

    // Inner gradient for dimension
    const gradientRadius = radius * 0.8
    g.circle(headX, centerY, gradientRadius)
    g.fill({ color, alpha: 0.9 })

    // Top highlight for glossiness
    g.ellipse(headX - radius * 0.25, centerY - radius * 0.35, radius * 0.5, radius * 0.35)
    g.fill({ color: 0xffffff, alpha: 0.4 })

    // Smaller inner highlight
    g.circle(headX - radius * 0.3, centerY - radius * 0.3, radius * 0.2)
    g.fill({ color: 0xffffff, alpha: 0.6 })

    // Clean border
    g.circle(headX, centerY, radius)
    g.stroke({
        width: selected ? 2 : 1,
        color: selected ? 0xFACC15 : 0x000000,
        alpha: selected ? 0.9 : 0.2
    })

    // Status indicator dot (subtle)
    if (status === 'in_progress' || status === 'completed') {
        const dotRadius = 2
        const dotX = headX + radius * 0.5
        const dotY = centerY - radius * 0.5

        // Dot with glow
        g.circle(dotX, dotY, dotRadius + 1)
        g.fill({ color: glowColor, alpha: 0.3 })
        g.circle(dotX, dotY, dotRadius)
        g.fill({ color: glowColor, alpha: 1 })
    }

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


