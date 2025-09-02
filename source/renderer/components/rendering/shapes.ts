import { Container, Graphics } from 'pixi.js'
import type { TimelineConfig, TaskLayout } from '../../core/types/renderer'

/**
 * Draws the task note body path at absolute coordinates into the provided Graphics.
 * This mirrors the rounded-rectangle-with-left-circle shape used for tasks.
 */
export function drawNoteBodyPathAbsolute(
  graphics: Graphics,
  x: number,
  topY: number,
  width: number,
  height: number
): void {
  const radius = height / 2
  graphics.beginPath()
  graphics.moveTo(x + radius, topY)
  graphics.lineTo(x + width - 4, topY)
  graphics.quadraticCurveTo(x + width, topY, x + width, topY + 4)
  graphics.lineTo(x + width, topY + height - 4)
  graphics.quadraticCurveTo(x + width, topY + height, x + width - 4, topY + height)
  graphics.lineTo(x + radius, topY + height)
  graphics.arc(x + radius, topY + radius, radius, Math.PI / 2, -Math.PI / 2, false)
  graphics.closePath()
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

/**
 * Draw a selection highlight around a task note shape. Returns the created Graphics.
 */
export function drawSelectionHighlight(
  container: Container,
  config: TimelineConfig,
  layout: TaskLayout
): Graphics {
  const selectionGraphics = new Graphics()
  const selectionPadding = 3

  selectionGraphics.beginPath()
  const selectionRadius = layout.radius + selectionPadding
  selectionGraphics.moveTo(layout.startX + layout.radius, layout.topY - selectionPadding)
  selectionGraphics.lineTo(layout.startX + layout.width - 4, layout.topY - selectionPadding)
  selectionGraphics.quadraticCurveTo(
    layout.startX + layout.width + selectionPadding, layout.topY - selectionPadding,
    layout.startX + layout.width + selectionPadding, layout.topY + 4
  )
  selectionGraphics.lineTo(layout.startX + layout.width + selectionPadding, layout.topY + config.TASK_HEIGHT - 4)
  selectionGraphics.quadraticCurveTo(
    layout.startX + layout.width + selectionPadding, layout.topY + config.TASK_HEIGHT + selectionPadding,
    layout.startX + layout.width - 4, layout.topY + config.TASK_HEIGHT + selectionPadding
  )
  selectionGraphics.lineTo(layout.startX + layout.radius, layout.topY + config.TASK_HEIGHT + selectionPadding)
  selectionGraphics.arc(
    layout.startX + layout.radius, layout.centerY,
    selectionRadius,
    Math.PI / 2, -Math.PI / 2,
    false
  )
  selectionGraphics.closePath()
  selectionGraphics.stroke({ width: 2, color: config.SELECTION_COLOR, alpha: 1 })
  container.addChild(selectionGraphics)
  return selectionGraphics
}
