import { Container, Graphics, Text } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'
import { MODAL, BUTTON, INPUT, SPACING } from '@config/ui'
import type { Staff, Task } from '@types'

export interface TaskDetailsAPI {
  setRect: (key: string, rect: { x: number; y: number; w: number; h: number }) => void
}

export class TaskDetailsModal {
  render(
    ui: Container,
    screenW: number,
    screenH: number,
    task: Task,
    taskLayout: { x: number; y: number; w: number; h: number },
    staffs: Staff[],
    api: TaskDetailsAPI
  ) {
    const panelW = MODAL.TASK_DETAILS.WIDTH
    const panelH = MODAL.TASK_DETAILS.HEIGHT
    const px = Math.round(Math.max(MODAL.TASK_DETAILS.MARGIN, Math.min(screenW - panelW - MODAL.TASK_DETAILS.MARGIN, taskLayout.x + taskLayout.w + SPACING.MEDIUM + 4)))
    const py = Math.round(Math.max(MODAL.TASK_DETAILS.MARGIN, Math.min(screenH - panelH - MODAL.TASK_DETAILS.MARGIN, taskLayout.y)))

    const panel = new Graphics()
    panel.roundRect(px, py, panelW, panelH, MODAL.TASK_DETAILS.BORDER_RADIUS)
    const bg = getCssVarColor('--ui-surface-1-focus', 0x111827)
    const border = getCssVarColor('--ui-color-border', 0xffffff)
    panel.fill({ color: bg, alpha: 0.98 })
    panel.stroke({ width: 1, color: border, alpha: 0.1 })
    ui.addChild(panel)

    const title = new Text({ text: 'Task', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 13, fontWeight: 'bold', fill: 0xffffff } })
    title.x = px + MODAL.TASK_DETAILS.PADDING
    title.y = py + Math.max(8, Math.floor(MODAL.TASK_DETAILS.PADDING * 0.8))
    ui.addChild(title)

    const close = new Graphics()
    close.roundRect(px + panelW - 54, py + Math.max(8, Math.floor(MODAL.TASK_DETAILS.PADDING * 0.8)), 44, INPUT.HEIGHT_MEDIUM - 2, BUTTON.BORDER_RADIUS)
    const btn = getCssVarColor('--ui-color-bg', 0x374151)
    close.fill({ color: btn, alpha: 0.95 })
    ui.addChild(close)
    const closeT = new Text({ text: 'Close', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    closeT.x = px + panelW - 54 + Math.max(8, Math.floor(BUTTON.PADDING * 0.75))
    closeT.y = py + Math.max(10, Math.floor(MODAL.TASK_DETAILS.PADDING * 0.9))
    ui.addChild(closeT)
    api.setRect('td:close', { x: px + panelW - 54, y: py + Math.max(8, Math.floor(MODAL.TASK_DETAILS.PADDING * 0.8)), w: 44, h: INPUT.HEIGHT_MEDIUM - 2 })

    // Title field
    const y1 = py + 36
    const nameLbl = new Text({ text: 'Title', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } })
    nameLbl.x = px + 10
    nameLbl.y = y1 - 14
    ui.addChild(nameLbl)
    const nameBox = new Graphics()
    nameBox.roundRect(px + MODAL.TASK_DETAILS.PADDING, y1, panelW - MODAL.TASK_DETAILS.PADDING * 2, INPUT.HEIGHT_MEDIUM, INPUT.BORDER_RADIUS)
    nameBox.fill({ color: 0x0b1220, alpha: 0.95 })
    nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.1 })
    ui.addChild(nameBox)
    const nameText = new Text({ text: task.title || ' ', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    nameText.x = px + MODAL.TASK_DETAILS.PADDING + Math.max(6, Math.floor(INPUT.PADDING * 0.75))
    nameText.y = y1 + Math.max(4, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2))
    ui.addChild(nameText)
    api.setRect('td:title', { x: px + MODAL.TASK_DETAILS.PADDING, y: y1, w: panelW - MODAL.TASK_DETAILS.PADDING * 2, h: INPUT.HEIGHT_MEDIUM })

    // Status button
    const y2 = py + 36 + SPACING.ROW_SPACING
    const statusLbl = new Text({ text: 'Status', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } })
    statusLbl.x = px + 10
    statusLbl.y = y2 - 14
    ui.addChild(statusLbl)
    const stBtn = new Graphics()
    stBtn.roundRect(px + MODAL.TASK_DETAILS.PADDING, y2, 100, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS)
    stBtn.fill({ color: 0x1f2937, alpha: 0.95 })
    ui.addChild(stBtn)
    const stText = new Text({ text: (task as any).status || 'not_started', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0xffffff } })
    stText.x = px + MODAL.TASK_DETAILS.PADDING + Math.max(6, Math.floor(INPUT.PADDING * 0.75))
    stText.y = y2 + Math.max(4, Math.floor((INPUT.HEIGHT_MEDIUM - 11) / 2))
    ui.addChild(stText)
    api.setRect('td:status:next', { x: px + MODAL.TASK_DETAILS.PADDING, y: y2, w: 100, h: INPUT.HEIGHT_MEDIUM })

    // Start/date + duration
    const y3 = py + 36 + SPACING.ROW_SPACING + SPACING.ROW_SPACING
    const startLbl = new Text({ text: 'Start', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } })
    startLbl.x = px + 10
    startLbl.y = y3 - 14
    ui.addChild(startLbl)
    const startDec = new Graphics(); startDec.roundRect(px + MODAL.TASK_DETAILS.PADDING, y3, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); startDec.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(startDec)
    const startDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); startDecT.x = px + MODAL.TASK_DETAILS.PADDING + Math.max(8, Math.floor(BUTTON.PADDING * 0.75)); startDecT.y = y3 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(startDecT)
    api.setRect('td:start:dec', { x: px + MODAL.TASK_DETAILS.PADDING, y: y3, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })
    const startVal = new Text({ text: task.startDate, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); startVal.x = px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + SPACING.LARGE; startVal.y = y3 + Math.max(3, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(startVal)
    const startInc = new Graphics(); startInc.roundRect(px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140, y3, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); startInc.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(startInc)
    const startIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); startIncT.x = px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140 + Math.max(8, Math.floor(BUTTON.PADDING * 0.75)); startIncT.y = y3 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(startIncT)
    api.setRect('td:start:inc', { x: px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140, y: y3, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })

    const durLbl = new Text({ text: 'Dur', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } })
    durLbl.x = px + 200; durLbl.y = y3 - 14; ui.addChild(durLbl)
    const durDec = new Graphics(); durDec.roundRect(px + 200, y3, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); durDec.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(durDec)
    const durDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); durDecT.x = px + 208; durDecT.y = y3 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(durDecT)
    api.setRect('td:dur:dec', { x: px + 200, y: y3, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })
    const durVal = new Text({ text: String(task.durationDays), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); durVal.x = px + 230; durVal.y = y3 + Math.max(3, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(durVal)
    const durInc = new Graphics(); durInc.roundRect(px + 200 + 36, y3, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); durInc.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(durInc)
    const durIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); durIncT.x = px + 200 + 36 + Math.max(6, Math.floor(BUTTON.PADDING * 0.75)); durIncT.y = y3 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(durIncT)
    api.setRect('td:dur:inc', { x: px + 200 + 36, y: y3, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })

    // Staff & line
    const y4 = py + 36 + SPACING.ROW_SPACING + SPACING.ROW_SPACING + SPACING.ROW_SPACING
    const staffLbl = new Text({ text: 'Staff', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); staffLbl.x = px + 10; staffLbl.y = y4 - 14; ui.addChild(staffLbl)
    const stfDec = new Graphics(); stfDec.roundRect(px + MODAL.TASK_DETAILS.PADDING, y4, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); stfDec.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(stfDec)
    const stfDecT = new Text({ text: '<', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); stfDecT.x = px + MODAL.TASK_DETAILS.PADDING + Math.max(8, Math.floor(BUTTON.PADDING * 0.75)); stfDecT.y = y4 + Math.max(4, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(stfDecT)
    api.setRect('td:staff:prev', { x: px + MODAL.TASK_DETAILS.PADDING, y: y4, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })
    const staffName = new Text({ text: staffs.find(s => s.id === task.staffId)?.name || task.staffId, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); staffName.x = px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + SPACING.LARGE; staffName.y = y4 + Math.max(3, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(staffName)
    const stfInc = new Graphics(); stfInc.roundRect(px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140, y4, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); stfInc.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(stfInc)
    const stfIncT = new Text({ text: '>', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); stfIncT.x = px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140 + Math.max(8, Math.floor(BUTTON.PADDING * 0.75)); stfIncT.y = y4 + Math.max(4, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(stfIncT)
    api.setRect('td:staff:next', { x: px + MODAL.TASK_DETAILS.PADDING + BUTTON.SMALL_WIDTH + 140, y: y4, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })

    const lineLbl = new Text({ text: 'Line', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); lineLbl.x = px + 200; lineLbl.y = y4 - 14; ui.addChild(lineLbl)
    const lnDec = new Graphics(); lnDec.roundRect(px + 200, y4, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); lnDec.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(lnDec)
    const lnDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); lnDecT.x = px + 208; lnDecT.y = y4 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(lnDecT)
    api.setRect('td:line:dec', { x: px + 200, y: y4, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })
    const lnVal = new Text({ text: String(task.staffLine), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); lnVal.x = px + 230; lnVal.y = y4 + Math.max(3, Math.floor((INPUT.HEIGHT_MEDIUM - 12) / 2)); ui.addChild(lnVal)
    const lnInc = new Graphics(); lnInc.roundRect(px + 200 + 36, y4, BUTTON.SMALL_WIDTH, INPUT.HEIGHT_MEDIUM, BUTTON.BORDER_RADIUS); lnInc.fill({ color: 0x1f2937, alpha: 0.95 }); ui.addChild(lnInc)
    const lnIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); lnIncT.x = px + 200 + 36 + Math.max(6, Math.floor(BUTTON.PADDING * 0.75)); lnIncT.y = y4 + Math.max(2, Math.floor((INPUT.HEIGHT_MEDIUM - 14) / 2)); ui.addChild(lnIncT)
    api.setRect('td:line:inc', { x: px + 200 + 36, y: y4, w: BUTTON.SMALL_WIDTH, h: INPUT.HEIGHT_MEDIUM })
  }
}
