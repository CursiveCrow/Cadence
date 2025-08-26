/**
 * Scene drawing helpers for PixiJS v8
 * Provides reusable, testable functions for Cadence timeline rendering.
 */

// PixiJS v8 uses modular exports. In desktop bundler mode, global classes are still available on default import.
import { Container, Graphics, Text } from 'pixi.js'

export interface TimelineConfig {
  LEFT_MARGIN: number
  TOP_MARGIN: number
  DAY_WIDTH: number
  STAFF_SPACING: number
  STAFF_LINE_SPACING: number
  TASK_HEIGHT: number
  STAFF_LINE_COUNT: number
  BACKGROUND_COLOR: number
  GRID_COLOR_MAJOR: number
  GRID_COLOR_MINOR: number
  STAFF_LINE_COLOR: number
  TASK_COLORS: Record<string, number>
  DEPENDENCY_COLOR: number
  SELECTION_COLOR: number
}

export interface StaffLike {
  id: string
  name: string
  numberOfLines: number
}

export interface TaskLike {
  id: string
  title?: string
  startDate: string
  durationDays: number
  status?: string
  staffId: string
  staffLine: number
}

export interface DependencyLike {
  id: string
  srcTaskId: string
  dstTaskId: string
}

export interface TaskLayout {
  startX: number
  centerY: number
  topY: number
  width: number
  radius: number
}

export function computeTaskLayout(
  config: TimelineConfig,
  task: TaskLike,
  projectStartDate: Date,
  staffs: StaffLike[]
): TaskLayout {
  const taskStart = new Date(task.startDate)
  const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const startX = config.LEFT_MARGIN + dayIndex * config.DAY_WIDTH
  const width = Math.max(task.durationDays * config.DAY_WIDTH - 8, 40)

  const staffIndex = staffs.findIndex(s => s.id === task.staffId)
  const staffStartY = staffIndex === -1
    ? 40 + (task as any).laneIndex * 80 + 40
    : config.TOP_MARGIN + staffIndex * config.STAFF_SPACING

  const centerY = staffStartY + (task.staffLine * config.STAFF_LINE_SPACING / 2)
  const topY = centerY - config.TASK_HEIGHT / 2
  const radius = config.TASK_HEIGHT / 2

  return { startX, centerY, topY, width, radius }
}

export function drawGridAndStaff(
  container: Container,
  config: TimelineConfig,
  staffs: StaffLike[],
  projectStartDate: Date,
  screenWidth: number,
  screenHeight: number
): void {
  container.removeChildren()

  const graphics = new Graphics()
  const extendedWidth = Math.max(screenWidth, config.DAY_WIDTH * 365)
  const extendedHeight = Math.max(screenHeight * 3, 2000)

  for (let x = config.LEFT_MARGIN; x < extendedWidth; x += config.DAY_WIDTH * 7) {
    graphics.moveTo(x, 0)
    graphics.lineTo(x, extendedHeight)
    graphics.stroke({ width: 2, color: config.GRID_COLOR_MAJOR, alpha: 0.1 })
  }

  for (let x = config.LEFT_MARGIN; x < extendedWidth; x += config.DAY_WIDTH) {
    graphics.moveTo(x, 0)
    graphics.lineTo(x, extendedHeight)
    graphics.stroke({ width: 1, color: config.GRID_COLOR_MINOR, alpha: 0.05 })
  }

  let currentY = config.TOP_MARGIN
  staffs.forEach((staff) => {
    for (let line = 0; line < staff.numberOfLines; line++) {
      const y = currentY + line * config.STAFF_LINE_SPACING
      graphics.moveTo(config.LEFT_MARGIN, y)
      graphics.lineTo(extendedWidth, y)
      graphics.stroke({ width: 1, color: config.STAFF_LINE_COLOR, alpha: 0.6 })
    }

    const labelText = new Text({
      text: staff.name,
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'right'
      }
    })
    const staffCenterY = currentY + ((staff.numberOfLines - 1) * config.STAFF_LINE_SPACING) / 2
    labelText.x = config.LEFT_MARGIN - 15 - labelText.width
    labelText.y = staffCenterY - labelText.height / 2
    container.addChild(labelText)

    const clefSymbol = staff.name.toLowerCase().includes('treble') ? '𝄞' :
                       staff.name.toLowerCase().includes('bass') ? '𝄢' : '♪'
    const clefText = new Text({
      text: clefSymbol,
      style: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
        fill: 0xffffff
      }
    })
    clefText.x = config.LEFT_MARGIN + 15 - clefText.width / 2
    clefText.y = staffCenterY - clefText.height / 2
    container.addChild(clefText)

    currentY += config.STAFF_SPACING
  })

  const maxDays = Math.floor((extendedWidth - config.LEFT_MARGIN) / config.DAY_WIDTH)
  for (let i = 0; i < maxDays; i++) {
    const x = config.LEFT_MARGIN + i * config.DAY_WIDTH
    const date = new Date(projectStartDate)
    date.setDate(date.getDate() + i)
    const dateText = new Text({
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        fill: 0xffffff
      }
    })
    dateText.x = x + 5
    dateText.y = 25 - dateText.height / 2
    container.addChild(dateText)
  }

  container.addChildAt(graphics, 0)
}

export function drawTaskNote(
  container: Container,
  config: TimelineConfig,
  layout: TaskLayout,
  title: string,
  status: string | undefined,
  isSelected: boolean
): void {
  container.removeChildren()

  const graphics = new Graphics()

  graphics.roundRect(layout.startX + 2, layout.topY + 2, layout.width, config.TASK_HEIGHT, 4)
  graphics.fill({ color: 0x000000, alpha: 0.2 })

  graphics.beginPath()
  graphics.moveTo(layout.startX + layout.radius, layout.topY)
  graphics.lineTo(layout.startX + layout.width - 4, layout.topY)
  graphics.quadraticCurveTo(layout.startX + layout.width, layout.topY, layout.startX + layout.width, layout.topY + 4)
  graphics.lineTo(layout.startX + layout.width, layout.topY + config.TASK_HEIGHT - 4)
  graphics.quadraticCurveTo(layout.startX + layout.width, layout.topY + config.TASK_HEIGHT,
                            layout.startX + layout.width - 4, layout.topY + config.TASK_HEIGHT)
  graphics.lineTo(layout.startX + layout.radius, layout.topY + config.TASK_HEIGHT)
  graphics.arc(layout.startX + layout.radius, layout.centerY, layout.radius, Math.PI / 2, -Math.PI / 2, false)
  graphics.closePath()

  const statusKey = (status || 'default')
  const fillColor = isSelected ? config.SELECTION_COLOR : (config.TASK_COLORS[statusKey] || config.TASK_COLORS.default)
  graphics.fill({ color: fillColor, alpha: 0.9 })
  graphics.stroke({ width: isSelected ? 2 : 1, color: isSelected ? 0xFCD34D : 0xffffff, alpha: 0.3 })

  graphics.circle(layout.startX + layout.radius, layout.centerY, layout.radius - 2)
  graphics.fill({ color: 0xffffff, alpha: 0.2 })

  let accidental = ''
  if (status === 'blocked') accidental = '♭'
  else if (status === 'completed') accidental = '♮'
  else if (status === 'in_progress' || status === 'inProgress') accidental = '♯'
  else if (status === 'cancelled') accidental = '𝄪'

  if (accidental) {
    const accidentalText = new Text({
      text: accidental,
      style: {
        fontFamily: 'serif',
        fontSize: status === 'cancelled' ? 16 : 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
      }
    })
    accidentalText.x = layout.startX + layout.radius - accidentalText.width / 2
    accidentalText.y = layout.centerY - accidentalText.height / 2
    container.addChild(accidentalText)
  }

  if (layout.width > 30) {
    const titleText = title || ''
    const text = new Text({
      text: titleText,
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'left'
      }
    })

    const textX = layout.startX + config.TASK_HEIGHT + 8
    text.x = textX
    text.y = layout.centerY - text.height / 2

    const maxTextWidth = layout.width - config.TASK_HEIGHT - 16
    if (text.width > maxTextWidth) {
      let truncatedText = titleText
      while (text.width > maxTextWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1)
        text.text = truncatedText + '...'
      }
    }

    container.addChild(text)
  }

  container.addChildAt(graphics, 0)
}

export function drawDependencyArrow(
  graphics: Graphics,
  srcX: number,
  srcY: number,
  dstX: number,
  dstY: number,
  color: number
): void {
  graphics.clear()
  graphics.moveTo(srcX, srcY)
  const controlOffset = Math.abs(dstX - srcX) * 0.3
  graphics.bezierCurveTo(
    srcX + controlOffset, srcY,
    dstX - controlOffset, dstY,
    dstX, dstY
  )
  graphics.stroke({ width: 2, color, alpha: 0.6 })

  const angle = Math.atan2(dstY - srcY, dstX - srcX)
  const arrowSize = 8
  graphics.beginPath()
  graphics.moveTo(dstX, dstY)
  graphics.lineTo(
    dstX - arrowSize * Math.cos(angle - Math.PI / 6),
    dstY - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  graphics.lineTo(
    dstX - arrowSize * Math.cos(angle + Math.PI / 6),
    dstY - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  graphics.closePath()
  graphics.fill({ color, alpha: 0.6 })
}


