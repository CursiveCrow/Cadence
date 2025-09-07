import { Container, Graphics, Text } from 'pixi.js'
import type { Staff, Task } from '../../types'

export class ModalRenderer {
    private uiRects: Record<string, { x: number; y: number; w: number; h: number }> = {}
    private tempStaffName: string = ''
    private tempStaffLines: number = 5

    // Render the Staff Manager modal
    renderStaffManager(
        hud: Container,
        screenW: number,
        screenH: number,
        staffs: Staff[]
    ) {
        const W = Math.min(560, Math.max(360, Math.round(screenW * 0.6)))
        const H = Math.min(520, Math.max(320, Math.round(screenH * 0.6)))
        const X = Math.round((screenW - W) / 2)
        const Y = Math.round((screenH - H) / 2)

        // Backdrop
        const backdrop = new Graphics()
        backdrop.rect(0, 0, screenW, screenH)
        backdrop.fill({ color: 0x000000, alpha: 0.45 })
        hud.addChild(backdrop)
        this.uiRects['sm:close'] = { x: 0, y: 0, w: screenW, h: screenH }

        // Panel
        const panel = new Graphics()
        panel.roundRect(X, Y, W, H, 12)
        panel.fill({ color: 0x0f172a, alpha: 0.98 })
        panel.stroke({ width: 1, color: 0xffffff, alpha: 0.08 })
        hud.addChild(panel)

        // Header
        const title = new Text({
            text: 'Staff Manager',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fontWeight: 'bold',
                fill: 0xffffff
            }
        })
        title.x = X + 16
        title.y = Y + 12
        hud.addChild(title)

        this.renderNewStaffSection(hud, X, Y, W)
        this.renderExistingStaffsSection(hud, X, Y, W, staffs)
    }

    private renderNewStaffSection(hud: Container, X: number, Y: number, W: number) {
        // New staff row
        const rowY = Y + 44
        const nameLabel = new Text({
            text: 'Name',
            style: {
                fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0x94a3b8
            }
        })
        nameLabel.x = X + 16
        nameLabel.y = rowY
        hud.addChild(nameLabel)

        const nameBoxW = Math.round(W * 0.5)
        const nameBoxX = X + 16
        const nameBoxY = rowY + 18
        const nameBox = new Graphics()
        nameBox.roundRect(nameBoxX, nameBoxY, nameBoxW, 24, 6)
        nameBox.fill({ color: 0x111827, alpha: 0.95 })
        nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        hud.addChild(nameBox)
        const nameVal = new Text({
            text: this.tempStaffName || ' ',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        nameVal.x = nameBoxX + 8
        nameVal.y = nameBoxY + 4
        hud.addChild(nameVal)
        this.uiRects['sm:new:name'] = { x: nameBoxX, y: nameBoxY, w: nameBoxW, h: 24 }

        const linesLabel = new Text({
            text: 'Lines',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0x94a3b8
            }
        })
        linesLabel.x = nameBoxX + nameBoxW + 16
        linesLabel.y = rowY
        hud.addChild(linesLabel)

        const linesY = nameBoxY
        this.renderIncrementDecrementControls(hud, linesLabel.x, linesY, this.tempStaffLines, 'sm:new:lines')

        // Add button
        const addLabel = new Text({
            text: 'Add',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        const addW = Math.round(addLabel.width + 20)
        const addX = X + W - addW - 16
        const addY = linesY
        const addBtn = new Graphics()
        addBtn.roundRect(addX, addY, addW, 24, 6)
        addBtn.fill({ color: 0x2563eb, alpha: 0.95 })
        addBtn.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        hud.addChild(addBtn)
        addLabel.x = addX + 10
        addLabel.y = addY + 4
        hud.addChild(addLabel)
        this.uiRects['sm:new:add'] = { x: addX, y: addY, w: addW, h: 24 }
    }

    private renderExistingStaffsSection(hud: Container, X: number, Y: number, W: number, staffs: Staff[]) {
        // Existing staffs list header
        const listTop = Y + 44 + 18 + 40 // rowY + nameBox height + spacing
        const head = new Text({
            text: 'Existing',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0x94a3b8
            }
        })
        head.x = X + 16
        head.y = listTop
        hud.addChild(head)

        // Staff list rows
        let rowTop = listTop + 18
        for (const s of staffs) {
            this.renderStaffRow(hud, X, Y, W, s, rowTop)
            rowTop += 32
        }
    }

    private renderStaffRow(hud: Container, X: number, Y: number, W: number, staff: Staff, rowTop: number) {
        const rowBg = new Graphics()
        rowBg.roundRect(X + 12, rowTop, W - 24, 28, 6)
        rowBg.fill({ color: 0x0b1220, alpha: 0.9 })
        rowBg.stroke({ width: 1, color: 0xffffff, alpha: 0.06 })
        hud.addChild(rowBg)

        const nameX = X + 18
        const nameW = Math.round((W - 36) * 0.45)
        const nameT = new Text({
            text: staff.name,
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        nameT.x = nameX + 8
        nameT.y = rowTop + 6
        hud.addChild(nameT)
        this.uiRects[`sm:item:${staff.id}:name`] = { x: nameX, y: rowTop + 2, w: nameW, h: 24 }

        const tsX = nameX + nameW + 8
        const tsW = 70
        const tsBg = new Graphics()
        tsBg.roundRect(tsX, rowTop + 2, tsW, 24, 6)
        tsBg.fill({ color: 0x111827, alpha: 0.95 })
        tsBg.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        hud.addChild(tsBg)
        const tsT = new Text({
            text: staff.timeSignature || '4/4',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        tsT.x = tsX + 8
        tsT.y = rowTop + 6
        hud.addChild(tsT)
        this.uiRects[`sm:item:${staff.id}:ts`] = { x: tsX, y: rowTop + 2, w: tsW, h: 24 }

        // Lines increment/decrement controls
        const lnX = tsX + tsW + 8
        this.renderIncrementDecrementControls(hud, lnX, rowTop + 2, staff.numberOfLines, `sm:item:${staff.id}:lines`)

        // Reorder and delete buttons
        this.renderStaffRowButtons(hud, X, Y, W, staff, rowTop)
    }

    private renderIncrementDecrementControls(
        hud: Container,
        x: number,
        y: number,
        value: number,
        keyPrefix: string
    ) {
        // Decrement button
        const dec = new Graphics()
        dec.roundRect(x, y, 24, 24, 6)
        dec.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(dec)
        const decT = new Text({
            text: '-',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 16,
                fill: 0xffffff
            }
        })
        decT.x = x + 8
        decT.y = y + 2
        hud.addChild(decT)
        this.uiRects[`${keyPrefix}:dec`] = { x, y, w: 24, h: 24 }

        // Value display
        const valBoxX = x + 28
        const valBox = new Graphics()
        valBox.roundRect(valBoxX, y, 36, 24, 6)
        valBox.fill({ color: 0x111827, alpha: 0.95 })
        valBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        hud.addChild(valBox)
        const valT = new Text({
            text: String(value),
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        valT.x = valBoxX + 12
        valT.y = y + 4
        hud.addChild(valT)

        // Increment button
        const incX = valBoxX + 40
        const inc = new Graphics()
        inc.roundRect(incX, y, 24, 24, 6)
        inc.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(inc)
        const incT = new Text({
            text: '+',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 16,
                fill: 0xffffff
            }
        })
        incT.x = incX + 6
        incT.y = y + 2
        hud.addChild(incT)
        this.uiRects[`${keyPrefix}:inc`] = { x: incX, y, w: 24, h: 24 }
    }

    private renderStaffRowButtons(hud: Container, X: number, _Y: number, W: number, staff: Staff, rowTop: number) {
        // Up button
        const upX = X + W - 96
        const upBtn = new Graphics()
        upBtn.roundRect(upX, rowTop + 2, 28, 24, 6)
        upBtn.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(upBtn)
        const upT = new Text({
            text: 'Up',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        upT.x = upX + 6
        upT.y = rowTop + 6
        hud.addChild(upT)
        this.uiRects[`sm:item:${staff.id}:up`] = { x: upX, y: rowTop + 2, w: 28, h: 24 }

        // Down button
        const dnX = upX + 32
        const dnBtn = new Graphics()
        dnBtn.roundRect(dnX, rowTop + 2, 36, 24, 6)
        dnBtn.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(dnBtn)
        const dnT = new Text({
            text: 'Down',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        dnT.x = dnX + 6
        dnT.y = rowTop + 6
        hud.addChild(dnT)
        this.uiRects[`sm:item:${staff.id}:down`] = { x: dnX, y: rowTop + 2, w: 36, h: 24 }

        // Delete button
        const delX = dnX + 40
        const delBtn = new Graphics()
        delBtn.roundRect(delX, rowTop + 2, 48, 24, 6)
        delBtn.fill({ color: 0x7f1d1d, alpha: 0.95 })
        hud.addChild(delBtn)
        const delT = new Text({
            text: 'Delete',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        delT.x = delX + 6
        delT.y = rowTop + 6
        hud.addChild(delT)
        this.uiRects[`sm:item:${staff.id}:del`] = { x: delX, y: rowTop + 2, w: 48, h: 24 }
    }

    // Render the Task Details modal
    renderTaskDetails(
        hud: Container,
        screenW: number,
        screenH: number,
        task: Task,
        taskLayout: { x: number; y: number; w: number; h: number },
        staffs: Staff[]
    ) {
        const panelW = 260
        const panelH = 180
        const px = Math.round(Math.max(10, Math.min(screenW - panelW - 10, taskLayout.x + taskLayout.w + 12)))
        const py = Math.round(Math.max(10, Math.min(screenH - panelH - 10, taskLayout.y)))

        // Panel background
        const panel = new Graphics()
        panel.roundRect(px, py, panelW, panelH, 8)
        panel.fill({ color: 0x111827, alpha: 0.98 })
        panel.stroke({ width: 1, color: 0xffffff, alpha: 0.1 })
        hud.addChild(panel)

        // Header with close button
        const title = new Text({
            text: 'Task',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 13,
                fontWeight: 'bold',
                fill: 0xffffff
            }
        })
        title.x = px + 10
        title.y = py + 8
        hud.addChild(title)

        const close = new Graphics()
        close.roundRect(px + panelW - 54, py + 8, 44, 20, 6)
        close.fill({ color: 0x374151, alpha: 0.95 })
        hud.addChild(close)
        const closeT = new Text({
            text: 'Close',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        closeT.x = px + panelW - 54 + 8
        closeT.y = py + 10
        hud.addChild(closeT)
        this.uiRects['td:close'] = { x: px + panelW - 54, y: py + 8, w: 44, h: 20 }

        this.renderTaskTitleField(hud, px, py, panelW, task)
        this.renderTaskStatusField(hud, px, py, task)
        this.renderTaskDateAndDurationFields(hud, px, py, task)
        this.renderTaskStaffAndLineFields(hud, px, py, task, staffs)
    }

    private renderTaskTitleField(hud: Container, px: number, py: number, panelW: number, task: Task) {
        // Title field
        const y1 = py + 36
        const nameLbl = new Text({
            text: 'Title',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        nameLbl.x = px + 10
        nameLbl.y = y1 - 14
        hud.addChild(nameLbl)

        const nameBox = new Graphics()
        nameBox.roundRect(px + 10, y1, panelW - 20, 22, 6)
        nameBox.fill({ color: 0x0b1220, alpha: 0.95 })
        nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.1 })
        hud.addChild(nameBox)

        const nameText = new Text({
            text: task.title || ' ',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        nameText.x = px + 16
        nameText.y = y1 + 4
        hud.addChild(nameText)
        this.uiRects['td:title'] = { x: px + 10, y: y1, w: panelW - 20, h: 22 }
    }

    private renderTaskStatusField(hud: Container, px: number, py: number, task: Task) {
        // Status chip as button cycles
        const y2 = py + 36 + 32
        const statusLbl = new Text({
            text: 'Status',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        statusLbl.x = px + 10
        statusLbl.y = y2 - 14
        hud.addChild(statusLbl)

        const stBtn = new Graphics()
        stBtn.roundRect(px + 10, y2, 100, 22, 6)
        stBtn.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(stBtn)

        const stText = new Text({
            text: (task as any).status || 'not_started',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0xffffff
            }
        })
        stText.x = px + 16
        stText.y = y2 + 4
        hud.addChild(stText)
        this.uiRects['td:status:next'] = { x: px + 10, y: y2, w: 100, h: 22 }
    }

    private renderTaskDateAndDurationFields(hud: Container, px: number, py: number, task: Task) {
        // Start, Duration controls
        const y3 = py + 36 + 32 + 32

        // Start date controls
        const startLbl = new Text({
            text: 'Start',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        startLbl.x = px + 10
        startLbl.y = y3 - 14
        hud.addChild(startLbl)

        const startDec = new Graphics()
        startDec.roundRect(px + 10, y3, 24, 22, 6)
        startDec.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(startDec)
        const startDecT = new Text({
            text: '-',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        startDecT.x = px + 18
        startDecT.y = y3 + 2
        hud.addChild(startDecT)
        this.uiRects['td:start:dec'] = { x: px + 10, y: y3, w: 24, h: 22 }

        const startVal = new Text({
            text: task.startDate,
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        startVal.x = px + 40
        startVal.y = y3 + 3
        hud.addChild(startVal)

        const startInc = new Graphics()
        startInc.roundRect(px + 10 + 24 + 140, y3, 24, 22, 6)
        startInc.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(startInc)
        const startIncT = new Text({
            text: '+',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        startIncT.x = px + 10 + 24 + 140 + 8
        startIncT.y = y3 + 2
        hud.addChild(startIncT)
        this.uiRects['td:start:inc'] = { x: px + 10 + 24 + 140, y: y3, w: 24, h: 22 }

        // Duration controls
        const durLbl = new Text({
            text: 'Dur',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        durLbl.x = px + 200
        durLbl.y = y3 - 14
        hud.addChild(durLbl)

        const durDec = new Graphics()
        durDec.roundRect(px + 200, y3, 24, 22, 6)
        durDec.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(durDec)
        const durDecT = new Text({
            text: '-',
            style: {
                fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        durDecT.x = px + 208
        durDecT.y = y3 + 2
        hud.addChild(durDecT)
        this.uiRects['td:dur:dec'] = { x: px + 200, y: y3, w: 24, h: 22 }

        const durVal = new Text({
            text: String(task.durationDays),
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        durVal.x = px + 230
        durVal.y = y3 + 3
        hud.addChild(durVal)

        const durInc = new Graphics()
        durInc.roundRect(px + 200 + 36, y3, 24, 22, 6)
        durInc.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(durInc)
        const durIncT = new Text({
            text: '+',
            style: {
                fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        durIncT.x = px + 200 + 36 + 6
        durIncT.y = y3 + 2
        hud.addChild(durIncT)
        this.uiRects['td:dur:inc'] = { x: px + 200 + 36, y: y3, w: 24, h: 22 }
    }

    private renderTaskStaffAndLineFields(hud: Container, px: number, py: number, task: Task, staffs: Staff[]) {
        // Staff & Line
        const y4 = py + 36 + 32 + 32 + 32

        // Staff controls
        const staffLbl = new Text({
            text: 'Staff',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        staffLbl.x = px + 10
        staffLbl.y = y4 - 14
        hud.addChild(staffLbl)

        const stfDec = new Graphics()
        stfDec.roundRect(px + 10, y4, 24, 22, 6)
        stfDec.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(stfDec)
        const stfDecT = new Text({
            text: '<',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        stfDecT.x = px + 18
        stfDecT.y = y4 + 4
        hud.addChild(stfDecT)
        this.uiRects['td:staff:prev'] = { x: px + 10, y: y4, w: 24, h: 22 }

        const staffName = new Text({
            text: staffs.find(s => s.id === task.staffId)?.name || task.staffId,
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        staffName.x = px + 40
        staffName.y = y4 + 3
        hud.addChild(staffName)

        const stfInc = new Graphics()
        stfInc.roundRect(px + 10 + 24 + 140, y4, 24, 22, 6)
        stfInc.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(stfInc)
        const stfIncT = new Text({
            text: '>',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        stfIncT.x = px + 10 + 24 + 140 + 8
        stfIncT.y = y4 + 4
        hud.addChild(stfIncT)
        this.uiRects['td:staff:next'] = { x: px + 10 + 24 + 140, y: y4, w: 24, h: 22 }

        // Line controls
        const lineLbl = new Text({
            text: 'Line',
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 11,
                fill: 0x94a3b8
            }
        })
        lineLbl.x = px + 200
        lineLbl.y = y4 - 14
        hud.addChild(lineLbl)

        const lnDec = new Graphics()
        lnDec.roundRect(px + 200, y4, 24, 22, 6)
        lnDec.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(lnDec)
        const lnDecT = new Text({
            text: '-',
            style: {
                fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        lnDecT.x = px + 208
        lnDecT.y = y4 + 2
        hud.addChild(lnDecT)
        this.uiRects['td:line:dec'] = { x: px + 200, y: y4, w: 24, h: 22 }

        const lnVal = new Text({
            text: String(task.staffLine),
            style: {
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
        lnVal.x = px + 230
        lnVal.y = y4 + 3
        hud.addChild(lnVal)

        const lnInc = new Graphics()
        lnInc.roundRect(px + 200 + 36, y4, 24, 22, 6)
        lnInc.fill({ color: 0x1f2937, alpha: 0.95 })
        hud.addChild(lnInc)
        const lnIncT = new Text({
            text: '+',
            style: {
                fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif',
                fontSize: 14,
                fill: 0xffffff
            }
        })
        lnIncT.x = px + 200 + 36 + 6
        lnIncT.y = y4 + 2
        hud.addChild(lnIncT)
        this.uiRects['td:line:inc'] = { x: px + 200 + 36, y: y4, w: 24, h: 22 }
    }

    // Accessors for UI state
    getTempStaffName(): string {
        return this.tempStaffName
    }

    setTempStaffName(name: string) {
        this.tempStaffName = name
    }

    getTempStaffLines(): number {
        return this.tempStaffLines
    }

    setTempStaffLines(lines: number) {
        this.tempStaffLines = Math.max(1, Math.min(10, lines))
    }

    // UI hit testing
    hitTestUI(px: number, py: number): string | null {
        for (const [key, r] of Object.entries(this.uiRects)) {
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return key
        }
        return null
    }

    // Reset UI rects for each frame
    resetRects() {
        this.uiRects = {}
    }

    // Get current UI rects
    getUIRects() {
        return this.uiRects
    }
}
