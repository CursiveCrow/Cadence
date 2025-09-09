import { Graphics } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'

export function drawGridBackground(params: {
    width: number
    height: number
    LEFT_MARGIN: number
    pxPerDay: number
    viewportXDays: number
    bgColor?: number
}): Graphics[] {
    const { width, height, LEFT_MARGIN, pxPerDay, viewportXDays, bgColor = 0x292524 } = params
    const lineMajor = getCssVarColor('--ui-grid-major', 0x4a5568)
    const lineMinor = getCssVarColor('--ui-grid-minor', 0x1e293b)
    const accent = getCssVarColor('--ui-color-primary', 0xa855f7)
    const nodes: Graphics[] = []

    // Background gradient for depth
    const bg = new Graphics()
    bg.beginPath()
    bg.rect(LEFT_MARGIN, 0, width - LEFT_MARGIN, height)
    // Lighter content backdrop so lines remain crisp
    bg.fill({ color: bgColor, alpha: 0.28 })
    nodes.push(bg)

    const grid = new Graphics()
    const vx = viewportXDays
    const startDay = Math.max(0, Math.floor(vx))
    const endDay = Math.ceil(vx + (width - LEFT_MARGIN) / Math.max(pxPerDay, 1e-4))

    for (let day = startDay; day <= endDay; day++) {
        const gx = LEFT_MARGIN + (day - vx) * pxPerDay
        const xInt = Math.round(gx)
        // const wBand = Math.max(0.5, pxPerDay) // reserved if band fills return
        if (xInt <= LEFT_MARGIN + 1) continue

        // Removed alternating/day band fills for a cleaner, ink-on-paper background

        // grid lines with musical bar styling
        const xl = xInt + 0.5
        const isBarLine = day % 7 === 0

        if (isBarLine) {
            // Strong bar line (slightly lighter alpha for clarity)
            grid.moveTo(xl - 0.5, 0)
            grid.lineTo(xl - 0.5, height)
            grid.stroke({ width: 2, color: lineMajor, alpha: 0.18 })

            // Accent line
            grid.moveTo(xl + 1.5, 0)
            grid.lineTo(xl + 1.5, height)
            grid.stroke({ width: 1, color: lineMajor, alpha: 0.10 })
        } else {
            // Regular beat lines
            grid.moveTo(xl, 0)
            grid.lineTo(xl, height)
            grid.stroke({ width: 1, color: lineMinor, alpha: 0.16 })
        }

        // Sub-beat dots (like staccato marks)
        if (pxPerDay > 64 && !isBarLine) {
            for (let i = 0.25; i < 1; i += 0.25) {
                const subX = xInt + i * pxPerDay
                if (subX < width) {
                    for (let y = 50; y < height; y += 100) {
                        grid.circle(subX, y, 0.5)
                        grid.fill({ color: accent, alpha: 0.05 })
                    }
                }
            }
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

    // Staff background with subtle gradient (like aged paper)
    const staffHeight = (lines - 1) * lineSpacing + 10
    s.beginPath()
    s.rect(LEFT_MARGIN, yTop - 5, width - LEFT_MARGIN, staffHeight)
    s.fill({ color: 0xffffff, alpha: 0.01 })

    // Draw clef-like decoration at the start
    const clefX = LEFT_MARGIN + 10
    const clefCenterY = yTop + (lines - 1) * lineSpacing / 2

    // Treble clef inspired shape (simplified)
    s.beginPath()
    s.moveTo(clefX, clefCenterY - lineSpacing * 2)
    s.bezierCurveTo(
        clefX - 5, clefCenterY - lineSpacing,
        clefX + 5, clefCenterY + lineSpacing,
        clefX, clefCenterY + lineSpacing * 2
    )
    const accent = getCssVarColor('--ui-color-primary', 0xa855f7)
    s.stroke({ width: 2, color: accent, alpha: 0.2 })

    // Clef dot
    s.circle(clefX, clefCenterY, 3)
    s.fill({ color: accent, alpha: 0.3 })

    for (let i = 0; i < lines; i++) {
        const ly = yTop + i * lineSpacing
        const lineY = Math.round(ly) + 0.5

        // Main staff line with gradient effect
        s.moveTo(LEFT_MARGIN, lineY)
        s.lineTo(width, lineY)

        // Stronger lines at top and bottom
        const isEdgeLine = i === 0 || i === lines - 1
        const lineAlpha = isEdgeLine ? 0.4 : 0.3
        const lineWidth = isEdgeLine ? 1.5 : 1
        const staffColor = getCssVarColor('--ui-staff-line', 0x4a5568)
        s.stroke({ width: lineWidth, color: staffColor, alpha: lineAlpha })

        // Add subtle shadow under each line
        s.moveTo(LEFT_MARGIN, lineY + 1)
        s.lineTo(width, lineY + 1)
        s.stroke({ width: 1, color: 0x000000, alpha: 0.1 })

        // Paper texture between lines
        if (i < lines - 1) {
            const bandTop = Math.round(ly) + 1
            const bandH = Math.max(0.5, Math.round(lineSpacing) - 2)

            // Gradient band
            for (let j = 0; j < 3; j++) {
                s.rect(LEFT_MARGIN, bandTop + j * (bandH / 3), width - LEFT_MARGIN, bandH / 3)
                s.fill({ color: 0xffffff, alpha: 0.003 - j * 0.001 })
            }
        }
    }

    // Add ledger line hints (faint extensions)
    const ledgerExtension = 20
    for (let i = -1; i <= lines; i += lines + 1) {
        const ly = yTop + i * lineSpacing
        if (i === -1 || i === lines) {
            s.moveTo(LEFT_MARGIN - ledgerExtension, Math.round(ly) + 0.5)
            s.lineTo(LEFT_MARGIN, Math.round(ly) + 0.5)
            s.stroke({ width: 1, color: 0x4a5568, alpha: 0.1 })
        }
    }

    return s
}

// New: draw background and grid lines onto an existing Graphics (container-local coords)
export function drawGridBackgroundOn(g: Graphics, params: {
    widthLocal: number
    height: number
    pxPerDay: number
    viewportXDays: number
    bgColor?: number
}) {
    const { widthLocal, height, pxPerDay, viewportXDays, bgColor = 0x292524 } = params
    const lineMajor = getCssVarColor('--ui-grid-major', 0x4a5568)
    const lineMinor = getCssVarColor('--ui-grid-minor', 0x1e293b)
    const accent = getCssVarColor('--ui-color-primary', 0xa855f7)

    g.beginPath()
    g.rect(0, 0, Math.max(0, widthLocal), Math.max(0, height))
    g.fill({ color: bgColor, alpha: 0.28 })

    const vx = viewportXDays
    const startDay = Math.max(0, Math.floor(vx))
    const endDay = Math.ceil(vx + widthLocal / Math.max(pxPerDay, 1e-4))

    for (let day = startDay; day <= endDay; day++) {
        const gx = day * pxPerDay
        const xInt = Math.round(gx)
        if (xInt <= 1) continue

        const xl = xInt + 0.5
        const isBarLine = day % 7 === 0

        if (isBarLine) {
            g.moveTo(xl - 0.5, 0)
            g.lineTo(xl - 0.5, height)
            g.stroke({ width: 2, color: lineMajor, alpha: 0.18 })
            g.moveTo(xl + 1.5, 0)
            g.lineTo(xl + 1.5, height)
            g.stroke({ width: 1, color: lineMajor, alpha: 0.10 })
        } else {
            g.moveTo(xl, 0)
            g.lineTo(xl, height)
            g.stroke({ width: 1, color: lineMinor, alpha: 0.16 })
        }

        if (pxPerDay > 64 && !isBarLine) {
            for (let i = 0.25; i < 1; i += 0.25) {
                const subX = xInt + i * pxPerDay
                if (subX < widthLocal) {
                    for (let y = 50; y < height; y += 100) {
                        g.circle(subX, y, 0.5)
                        g.fill({ color: accent, alpha: 0.05 })
                    }
                }
            }
        }
    }
}

// New: draw staff lines onto an existing Graphics (container-local coords)
export function drawStaffLinesOn(g: Graphics, params: {
    widthLocal: number
    yTop: number
    lineSpacing: number
    lines: number
}) {
    const { widthLocal, yTop, lineSpacing, lines } = params

    const staffHeight = (lines - 1) * lineSpacing + 10
    g.beginPath()
    g.rect(0, yTop - 5, Math.max(0, widthLocal), staffHeight)
    g.fill({ color: 0xffffff, alpha: 0.01 })

    const clefX = 10
    const clefCenterY = yTop + (lines - 1) * lineSpacing / 2
    g.beginPath()
    g.moveTo(clefX, clefCenterY - lineSpacing * 2)
    g.bezierCurveTo(
        clefX - 5, clefCenterY - lineSpacing,
        clefX + 5, clefCenterY + lineSpacing,
        clefX, clefCenterY + lineSpacing * 2
    )
    const accent = getCssVarColor('--ui-color-primary', 0xa855f7)
    g.stroke({ width: 2, color: accent, alpha: 0.2 })
    g.circle(clefX, clefCenterY, 3)
    g.fill({ color: accent, alpha: 0.3 })

    for (let i = 0; i < lines; i++) {
        const ly = yTop + i * lineSpacing
        const lineY = Math.round(ly) + 0.5
        g.moveTo(0, lineY)
        g.lineTo(widthLocal, lineY)
        const isEdgeLine = i === 0 || i === lines - 1
        const lineAlpha = isEdgeLine ? 0.4 : 0.3
        const lineWidth = isEdgeLine ? 1.5 : 1
        const staffColor = getCssVarColor('--ui-staff-line', 0x4a5568)
        g.stroke({ width: lineWidth, color: staffColor, alpha: lineAlpha })
        g.moveTo(0, lineY + 1)
        g.lineTo(widthLocal, lineY + 1)
        g.stroke({ width: 1, color: 0x000000, alpha: 0.1 })

        if (i < lines - 1) {
            const bandTop = Math.round(ly) + 1
            const bandH = Math.max(0.5, Math.round(lineSpacing) - 2)
            for (let j = 0; j < 3; j++) {
                g.rect(0, bandTop + j * (bandH / 3), widthLocal, bandH / 3)
                g.fill({ color: 0xffffff, alpha: 0.003 - j * 0.001 })
            }
        }
    }

    const ledgerExtension = 20
    for (let i = -1; i <= lines; i += lines + 1) {
        const ly = yTop + i * lineSpacing
        if (i === -1 || i === lines) {
            g.moveTo(-ledgerExtension, Math.round(ly) + 0.5)
            g.lineTo(0, Math.round(ly) + 0.5)
            g.stroke({ width: 1, color: 0x4a5568, alpha: 0.1 })
        }
    }
}
