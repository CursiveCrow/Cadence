export const TIMELINE = {
  LEFT_MARGIN: 0,
  HEADER: 56,
  DAY_WIDTH: 60, // px per day at zoom 1
  STAFF_GAP: 20,
  TOP_MARGIN: 60, // distance from header to first staff center
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,
}

export function dprScale(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1))
  const { clientWidth, clientHeight } = canvas
  canvas.width = Math.max(1, Math.floor(clientWidth * ratio))
  canvas.height = Math.max(1, Math.floor(clientHeight * ratio))
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
}
