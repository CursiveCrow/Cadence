import { Container, Text } from 'pixi.js'

export class DebugOverlay {
  private text?: Text
  private enabled: boolean

  constructor() {
    const qp = new URLSearchParams(location.search)
    const q = qp.get('debug')
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('cadence.debug') : null
    this.enabled = q === '1' || ls === '1' || !!import.meta.env.DEV
  }

  render(ui: Container, stats: any) {
    if (!this.enabled) return
    if (!this.text) this.text = new Text({ text: '', style: { fill: 0x9ca3af, fontSize: 12 } })
    const fps = stats?.pixi?.fps ?? stats?.pixi?.FPS ?? 0
    const dc = stats?.pixi?.drawCalls ?? 0
    const tasks = stats?.layout?.tasksRendered ?? 0
    const sb = stats?.layout?.staffBlocks ?? 0
    this.text.text = `fps:${Math.round(fps)} dc:${dc} tasks:${tasks} staffs:${sb}`
    this.text.x = 8
    this.text.y = 8
    ui.addChild(this.text)
  }
}
