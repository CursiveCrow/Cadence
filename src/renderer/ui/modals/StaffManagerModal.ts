import { Container, Graphics, Text } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'
import { MODAL, BUTTON, INPUT, SPACING, UIUtils, STAFF } from '@config/ui'
import type { Staff } from '@types'

export interface StaffManagerAPI {
  setRect: (key: string, rect: { x: number; y: number; w: number; h: number }) => void
  getTempStaffName: () => string
  setTempStaffName: (name: string) => void
  getTempStaffLines: () => number
  setTempStaffLines: (n: number) => void
}

export class StaffManagerModal {
  render(ui: Container, screenW: number, screenH: number, staffs: Staff[], api: StaffManagerAPI) {
    const { width: W, height: H } = UIUtils.getModalSize(screenW, screenH, 'staffManager')
    const X = Math.round((screenW - W) / 2)
    const Y = Math.round((screenH - H) / 2)

    // Backdrop
    const backdrop = new Graphics()
    backdrop.rect(0, 0, screenW, screenH)
    backdrop.fill({ color: 0x000000, alpha: MODAL.BACKDROP_ALPHA })
    ui.addChild(backdrop)
    api.setRect('sm:close', { x: 0, y: 0, w: screenW, h: screenH })

    // Panel
    const panel = new Graphics()
    panel.roundRect(X, Y, W, H, MODAL.STAFF_MANAGER.BORDER_RADIUS)
    const panelBg = getCssVarColor('--ui-surface-1-focus', 0x0f172a)
    const border = getCssVarColor('--ui-color-border', 0xffffff)
    panel.fill({ color: panelBg, alpha: 0.98 })
    panel.stroke({ width: 1, color: border, alpha: 0.08 })
    ui.addChild(panel)

    // Header
    const title = new Text({
      text: 'Staff Manager',
      style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffffff }
    })
    title.x = X + MODAL.STAFF_MANAGER.PADDING
    title.y = Y + Math.max(8, Math.round(MODAL.STAFF_MANAGER.PADDING * 0.75))
    ui.addChild(title)

    this.renderNewStaffSection(ui, X, Y, W, api)
    this.renderExistingStaffsSection(ui, X, Y, W, staffs, api)
  }

  private renderNewStaffSection(ui: Container, X: number, Y: number, W: number, api: StaffManagerAPI) {
    const rowY = Y + SPACING.SECTION_SPACING + 4
    const nameLabel = new Text({ text: 'Name', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } })
    nameLabel.x = X + MODAL.STAFF_MANAGER.PADDING
    nameLabel.y = rowY
    ui.addChild(nameLabel)

    const nameBoxW = Math.round(W * 0.5)
    const nameBoxX = X + MODAL.STAFF_MANAGER.PADDING
    const nameBoxY = rowY + SPACING.MEDIUM + 10
    const nameBox = new Graphics()
    nameBox.roundRect(nameBoxX, nameBoxY, nameBoxW, INPUT.HEIGHT, INPUT.BORDER_RADIUS)
    nameBox.fill({ color: 0x111827, alpha: 0.95 })
    nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    ui.addChild(nameBox)
    const nameVal = new Text({ text: api.getTempStaffName() || ' ', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    nameVal.x = nameBoxX + INPUT.PADDING
    nameVal.y = nameBoxY + Math.max(2, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(nameVal)
    api.setRect('sm:new:name', { x: nameBoxX, y: nameBoxY, w: nameBoxW, h: INPUT.HEIGHT })

    const linesLabel = new Text({ text: 'Lines', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } })
    linesLabel.x = nameBoxX + nameBoxW + SPACING.LARGE
    linesLabel.y = rowY
    ui.addChild(linesLabel)

    const linesY = nameBoxY
    this.renderIncDec(ui, linesLabel.x, linesY, api.getTempStaffLines(), 'sm:new:lines', api)

    // Add button
    const addLabel = new Text({ text: 'Add', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    const addW = Math.round(addLabel.width + 20)
    const addX = X + W - addW - MODAL.STAFF_MANAGER.PADDING
    const addY = linesY
    const addBtn = new Graphics()
    addBtn.roundRect(addX, addY, addW, BUTTON.HEIGHT, BUTTON.BORDER_RADIUS)
    addBtn.fill({ color: 0x2563eb, alpha: 0.95 })
    addBtn.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    ui.addChild(addBtn)
    addLabel.x = addX + Math.max(8, Math.floor(BUTTON.PADDING * 0.75))
    addLabel.y = addY + Math.max(4, Math.floor((BUTTON.HEIGHT - 12) / 2))
    ui.addChild(addLabel)
    api.setRect('sm:new:add', { x: addX, y: addY, w: addW, h: BUTTON.HEIGHT })
  }

  private renderExistingStaffsSection(ui: Container, X: number, Y: number, W: number, staffs: Staff[], api: StaffManagerAPI) {
    const listTop = Y + SPACING.SECTION_SPACING + SPACING.MEDIUM + SPACING.SECTION_SPACING
    const head = new Text({ text: 'Existing', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } })
    head.x = X + 16
    head.y = listTop
    ui.addChild(head)

    let rowTop = listTop + SPACING.MEDIUM
    for (const s of staffs) {
      this.renderStaffRow(ui, X, W, s, rowTop, api)
      rowTop += 32
    }
  }

  private renderStaffRow(ui: Container, X: number, W: number, staff: Staff, rowTop: number, api: StaffManagerAPI) {
    const rowBg = new Graphics()
    rowBg.roundRect(X + SPACING.LARGE, rowTop, W - (SPACING.LARGE * 2), SPACING.ROW_HEIGHT, BUTTON.BORDER_RADIUS)
    rowBg.fill({ color: 0x0b1220, alpha: 0.9 })
    rowBg.stroke({ width: 1, color: 0xffffff, alpha: 0.06 })
    ui.addChild(rowBg)

    const nameX = X + SPACING.LARGE + 6
    const nameW = Math.round((W - (SPACING.LARGE * 2 + 12)) * 0.45)
    const nameT = new Text({ text: staff.name, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    nameT.x = nameX + 8
    nameT.y = rowTop + 6
    ui.addChild(nameT)
    api.setRect(`sm:item:${staff.id}:name`, { x: nameX, y: rowTop + 2, w: nameW, h: INPUT.HEIGHT })

    const tsX = nameX + nameW + SPACING.MEDIUM
    const tsW = STAFF.TIME_SIGNATURE_WIDTH
    const tsBg = new Graphics()
    tsBg.roundRect(tsX, rowTop + 2, tsW, INPUT.HEIGHT, INPUT.BORDER_RADIUS)
    tsBg.fill({ color: 0x111827, alpha: 0.95 })
    tsBg.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    ui.addChild(tsBg)
    const tsT = new Text({ text: staff.timeSignature || '4/4', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    tsT.x = tsX + INPUT.PADDING
    tsT.y = rowTop + Math.max(4, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(tsT)
    api.setRect(`sm:item:${staff.id}:ts`, { x: tsX, y: rowTop + 2, w: tsW, h: INPUT.HEIGHT })

    const lnX = tsX + tsW + SPACING.MEDIUM
    this.renderIncDec(ui, lnX, rowTop + 2, staff.numberOfLines, `sm:item:${staff.id}:lines`, api)

    // Row buttons
    const upX = X + W - (SPACING.HUGE + SPACING.LARGE)
    const upBtn = new Graphics()
    upBtn.roundRect(upX, rowTop + 2, BUTTON.SMALL_WIDTH + 4, INPUT.HEIGHT, BUTTON.BORDER_RADIUS)
    upBtn.fill({ color: 0x1f2937, alpha: 0.95 })
    ui.addChild(upBtn)
    const upT = new Text({ text: 'Up', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    upT.x = upX + Math.max(6, Math.floor(BUTTON.PADDING * 0.75))
    upT.y = rowTop + Math.max(4, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(upT)
    api.setRect(`sm:item:${staff.id}:up`, { x: upX, y: rowTop + 2, w: BUTTON.SMALL_WIDTH + 4, h: INPUT.HEIGHT })

    const dnX = upX + BUTTON.SMALL_WIDTH + SPACING.MEDIUM
    const dnBtn = new Graphics()
    dnBtn.roundRect(dnX, rowTop + 2, BUTTON.SMALL_WIDTH + 12, INPUT.HEIGHT, BUTTON.BORDER_RADIUS)
    dnBtn.fill({ color: 0x1f2937, alpha: 0.95 })
    ui.addChild(dnBtn)
    const dnT = new Text({ text: 'Down', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    dnT.x = dnX + Math.max(6, Math.floor(BUTTON.PADDING * 0.75))
    dnT.y = rowTop + Math.max(4, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(dnT)
    api.setRect(`sm:item:${staff.id}:down`, { x: dnX, y: rowTop + 2, w: BUTTON.SMALL_WIDTH + 12, h: INPUT.HEIGHT })

    const delX = dnX + BUTTON.SMALL_WIDTH + SPACING.MEDIUM
    const delBtn = new Graphics()
    delBtn.roundRect(delX, rowTop + 2, BUTTON.SMALL_WIDTH + 24, INPUT.HEIGHT, BUTTON.BORDER_RADIUS)
    delBtn.fill({ color: 0x7f1d1d, alpha: 0.95 })
    ui.addChild(delBtn)
    const delT = new Text({ text: 'Delete', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    delT.x = delX + Math.max(6, Math.floor(BUTTON.PADDING * 0.75))
    delT.y = rowTop + Math.max(4, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(delT)
    api.setRect(`sm:item:${staff.id}:del`, { x: delX, y: rowTop + 2, w: BUTTON.SMALL_WIDTH + 24, h: INPUT.HEIGHT })
  }

  private renderIncDec(ui: Container, x: number, y: number, value: number, keyPrefix: string, api: StaffManagerAPI) {
    const dec = new Graphics()
    dec.roundRect(x, y, INPUT.HEIGHT, INPUT.HEIGHT, INPUT.BORDER_RADIUS)
    dec.fill({ color: 0x1f2937, alpha: 0.95 })
    ui.addChild(dec)
    const decT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } })
    decT.x = x + Math.max(8, Math.floor(INPUT.PADDING))
    decT.y = y + Math.max(2, Math.floor((INPUT.HEIGHT - 16) / 2))
    ui.addChild(decT)
    api.setRect(`${keyPrefix}:dec`, { x, y, w: INPUT.HEIGHT, h: INPUT.HEIGHT })

    const valBoxX = x + INPUT.HEIGHT + SPACING.SMALL
    const valBox = new Graphics()
    valBox.roundRect(valBoxX, y, 36, INPUT.HEIGHT, INPUT.BORDER_RADIUS)
    valBox.fill({ color: 0x111827, alpha: 0.95 })
    valBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    ui.addChild(valBox)
    const valT = new Text({ text: String(value), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    valT.x = valBoxX + Math.max(10, INPUT.PADDING + 2)
    valT.y = y + Math.max(4, Math.floor((INPUT.HEIGHT - 12) / 2))
    ui.addChild(valT)

    const incX = valBoxX + 40
    const inc = new Graphics()
    inc.roundRect(incX, y, INPUT.HEIGHT, INPUT.HEIGHT, INPUT.BORDER_RADIUS)
    inc.fill({ color: 0x1f2937, alpha: 0.95 })
    ui.addChild(inc)
    const incT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } })
    incT.x = incX + Math.max(6, Math.floor(INPUT.PADDING * 0.75))
    incT.y = y + Math.max(2, Math.floor((INPUT.HEIGHT - 16) / 2))
    ui.addChild(incT)
    api.setRect(`${keyPrefix}:inc`, { x: incX, y, w: INPUT.HEIGHT, h: INPUT.HEIGHT })
  }
}
