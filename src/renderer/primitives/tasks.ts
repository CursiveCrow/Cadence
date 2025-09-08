import { Graphics, Text } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'

export function statusToColor(status: string): number {
    // Map task statuses to theme tokens (text colors work well for solid note heads)
    const map: Record<string, string> = {
        in_progress: '--ui-status-in-progress-text',
        completed: '--ui-status-completed-text',
        blocked: '--ui-status-blocked-text',
        cancelled: '--ui-status-cancelled-text',
        not_started: '--ui-status-not-started-text',
    }
    const token = map[status] || map['not_started']
    const fallback: Record<string, number> = {
        in_progress: 0x2563EB,
        completed: 0x22C55E,
        blocked: 0xEF4444,
        cancelled: 0x6B7280,
        not_started: 0xE5E7EB,
    }
    return getCssVarColor(token, fallback[status] ?? fallback['not_started'])
}

export function statusToGlowColor(status: string): number {
    // Use the same token as status color for glow; fall back to primary glow for not_started
    const tokenMap: Record<string, string> = {
        in_progress: '--ui-status-in-progress-text',
        completed: '--ui-status-completed-text',
        blocked: '--ui-status-blocked-text',
        cancelled: '--ui-status-cancelled-text',
        not_started: '--ui-color-primary-glow',
    }
    const fallback: Record<string, number> = {
        in_progress: 0x60A5FA,
        completed: 0x86EFAC,
        blocked: 0xFCA5A5,
        cancelled: 0x9CA3AF,
        not_started: 0xC084FC,
    }
    const token = tokenMap[status] || tokenMap['not_started']
    return getCssVarColor(token, fallback[status] ?? fallback['not_started'])
}

export function renderNoteHeadAndLine(g: Graphics, params: {
    x: number
    yTop: number
    width: number
    height: number
    color: number
    selected?: boolean
    pxPerDay: number
    status?: string
    hovered?: boolean
}): Graphics {
    const { x, yTop, width, height, color, selected, pxPerDay, status = 'not_started', hovered } = params
    g.clear()
    const radius = Math.max(7, Math.floor(height * 0.45))
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
        g.fill({ color, alpha: hovered ? 0.65 : 0.5 })

        // Track highlight
        g.rect(trackStart, trackY - 1, Math.min(trackW * 0.3, 20), 1)
        g.fill({ color: 0xffffff, alpha: hovered ? 0.45 : 0.3 })

        // End marker
        g.circle(trackEnd, centerY, 2)
        g.fill({ color, alpha: 0.8 })

        // Day tick marks - subtle
        const days = Math.max(1, Math.round(width / Math.max(pxPerDay, 1)))
        if (pxPerDay > 30) {
            for (let k = 1; k < days; k++) {
                const tx = Math.round(x + k * pxPerDay)
                if (tx > trackStart + 5 && tx < trackEnd - 5) {
                    g.rect(tx, centerY - 2, 1, 4)
                    g.fill({ color: 0xffffff, alpha: 0.15 })
                }
            }
        }
    }

    // Selection/hover glow effect
    if (selected || hovered) {
        for (let i = 3; i > 0; i--) {
            g.circle(headX, centerY, radius + i * 2)
            const sel = getCssVarColor('--ui-color-accent', 0xFACC15)
            const hov = getCssVarColor('--ui-color-primary-glow', 0xC084FC)
            g.fill({ color: selected ? sel : hov, alpha: (selected ? 0.05 : 0.04) * (4 - i) })
        }
    }

    // Very soft ink feathering
    g.circle(headX, centerY, radius + 1)
    g.fill({ color, alpha: 0.08 })

    // Main note head
    g.circle(headX, centerY, radius)
    g.fill({ color, alpha: 1 })

    // Clean border
    g.circle(headX, centerY, radius)
    g.stroke({
        width: selected ? 2 : (hovered ? 1.75 : 1.25),
        color: selected ? getCssVarColor('--ui-color-accent', 0xFACC15) : (hovered ? getCssVarColor('--ui-color-primary-glow', 0xC084FC) : 0x000000),
        alpha: selected ? 0.9 : (hovered ? 0.55 : 0.22)
    })

    // Status indicator dot (subtle)
    if (status === 'in_progress' || status === 'completed') {
        const dotRadius = 2
        const dotX = headX + radius * 0.5
        const dotY = centerY - radius * 0.5
        g.circle(dotX, dotY, dotRadius + 1)
        g.fill({ color: glowColor, alpha: 0.3 })
        g.circle(dotX, dotY, dotRadius)
        g.fill({ color: glowColor, alpha: 1 })
    }

    return g
}

export function renderLabelWithMast(gBox: Graphics, mast: Graphics, title: Text, params: {
    xLeft: number
    yTop: number
    h: number
    text: string
    headColor: number
    width: number
    height: number
    selected?: boolean
    hovered?: boolean
}): { box: { x: number; y: number; w: number; h: number } } {
    const { xLeft, yTop, h, text, headColor, width, height, selected, hovered } = params
    title.text = text
        ; (title.style as any).fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
        ; (title.style as any).fontSize = 10
        ; (title.style as any).fill = headColor
    const padX = 6
    const padY = 2
    const pillW = Math.round(title.width + padX * 2)
    const pillH = Math.round(title.height + padY * 2)
    const labelX = Math.max(2, Math.min(width - pillW - 2, Math.round(xLeft + h + 10)))
    const labelY = Math.max(2, Math.min(height - pillH - 2, Math.round(yTop - pillH - 1)))
    const boxX = Math.round(labelX - padX)
    const boxY = Math.round(labelY - padY)

    const eps = 1e-4
    const labelTop = boxY
    const labelBottom = boxY + pillH
    const stemStartX = Math.round(xLeft + h - 1)
    const stemStartY = Math.round(yTop + h / 2)
    const vX = boxX - stemStartX
    const vY = labelTop - stemStartY
    const k = Math.abs(vY) > eps ? (labelBottom - labelTop) / vY : 0
    const bottomLeftX = Math.round(boxX + k * vX)

    gBox.clear()
    gBox.beginPath()
    gBox.moveTo(boxX, labelTop)
    gBox.lineTo(boxX + pillW, labelTop)
    gBox.lineTo(boxX + pillW, labelBottom)
    gBox.lineTo(bottomLeftX, labelBottom)
    gBox.closePath()
    gBox.fill({ color: 0x000000, alpha: hovered ? 0.35 : 0.28 })
    gBox.stroke({ width: selected ? 2 : 1, color: headColor, alpha: selected ? 0.95 : (hovered ? 0.85 : 0.75) })
    gBox.rect(boxX + 1, labelTop + 1, pillW - 2, 1)
    gBox.fill({ color: 0xffffff, alpha: hovered ? 0.25 : 0.15 })

    mast.clear()
    mast.moveTo(stemStartX, stemStartY)
    mast.lineTo(boxX, labelTop)
    mast.stroke({ width: selected ? 3 : (hovered ? 2.5 : 2), color: headColor, alpha: 0.95 })

    title.x = Math.round(labelX)
    title.y = Math.round(labelY)
    if (hovered || selected) {
        ; (title.style as any).fill = 0xffffff
    }

    return { box: { x: boxX, y: boxY, w: pillW, h: pillH } }
}
