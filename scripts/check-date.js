function worldDaysToScreenX(dayIndex, viewport, leftMargin, dayWidth) {
  const ppd = dayWidth * (viewport.zoom || 1)
  return leftMargin + (dayIndex - (viewport.x || 0)) * ppd
}

function test() {
  const projectStart = new Date(Date.UTC(2024, 0, 1))
  const base = new Date(Date.UTC(projectStart.getUTCFullYear(), projectStart.getUTCMonth(), projectStart.getUTCDate()))
  const feb1 = new Date(Date.UTC(2024, 1, 1))
  const jan31 = new Date(Date.UTC(2024, 0, 31))
  const diffFeb = (feb1.getTime() - base.getTime()) / (24 * 3600 * 1000)
  const diffJan31 = (jan31.getTime() - base.getTime()) / (24 * 3600 * 1000)
  console.log('diffFeb days=', diffFeb, 'round=', Math.round(diffFeb), 'floor=', Math.floor(diffFeb))
  console.log('diffJan31 days=', diffJan31, 'round=', Math.round(diffJan31), 'floor=', Math.floor(diffJan31))

  const viewport = { x: 28.4, zoom: 1 }
  const leftMargin = 220
  const dayWidth = 80
  console.log('x Feb1=', worldDaysToScreenX(Math.round(diffFeb), viewport, leftMargin, dayWidth))
  console.log('x Jan31=', worldDaysToScreenX(Math.round(diffJan31), viewport, leftMargin, dayWidth))
}

test()

