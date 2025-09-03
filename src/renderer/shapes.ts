const lineColor = '#2b3242'
const gridColor = '#1c2230'

export function drawHorizontalLine(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number) {
  ctx.strokeStyle = lineColor
  ctx.beginPath()
  ctx.moveTo(x0, y + 0.5)
  ctx.lineTo(x1, y + 0.5)
  ctx.stroke()
}

export function drawVerticalGrid(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  ctx.strokeStyle = gridColor
  ctx.beginPath()
  ctx.moveTo(x + 0.5, y0)
  ctx.lineTo(x + 0.5, y1)
  ctx.stroke()
}

