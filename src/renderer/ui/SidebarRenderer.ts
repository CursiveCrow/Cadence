import { Container, Graphics, Text, Mesh, MeshGeometry, Shader } from 'pixi.js'
import { firstHit } from '@shared/geom'
import { UI_CONSTANTS } from '@config/ui'
import type { Staff } from '@types'
import { SIDEBAR_SOLID_BLUE_MESH_WGSL } from '@renderer/shaders/sidebarSolidBlueMesh'

export class SidebarRenderer {
  private bgContainer?: Container
  private bgMesh?: Mesh
  private bgGeom?: MeshGeometry
  private bgShader?: Shader
  private rects: Record<string, { x: number; y: number; w: number; h: number }> = {}
  private labels: Record<string, Text> = {}

  // Persistent background: create once, lives in uiPersistent
  renderBackground(uiPersistent: Container, screenH: number, width: number) {
    // Container & sprite
    if (!this.bgContainer) {
      this.bgContainer = new Container()
      uiPersistent.addChild(this.bgContainer)
    }
    // Mesh-based shader background (no filter) for reliability
    if (!this.bgGeom) {
      this.bgGeom = new MeshGeometry({
        positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3])
      })
    }
    // Update geometry positions to match sidebar size
    const w = Math.max(0, width)
    const h = Math.max(0, screenH)
    this.bgGeom.positions = new Float32Array([0, 0, w, 0, w, h, 0, h])

    if (!this.bgShader) {
      this.bgShader = Shader.from({
        gpu: {
          vertex: { source: SIDEBAR_SOLID_BLUE_MESH_WGSL, entryPoint: 'mainVertex' },
          fragment: { source: SIDEBAR_SOLID_BLUE_MESH_WGSL, entryPoint: 'mainFragment' },
        },
        name: 'sidebar-solid-blue-mesh',
      } as any)
    }
    if (!this.bgMesh) {
      this.bgMesh = new Mesh({ geometry: this.bgGeom, shader: this.bgShader as any })
      this.bgContainer.addChild(this.bgMesh)
    }
    // Position mesh at origin of the persistent UI container
    try { (this.bgMesh as any).position?.set?.(0, 0) } catch {}

    // WGSL filter (no GLSL fallbacks per request)
    // Remove legacy filter usage; mesh shader handles color output
  }

  // Dynamic overlay: rim and labels (rendered on the regular UI layer)
  renderForeground(
    ui: Container,
    screenH: number,
    width: number,
    staffs?: Staff[],
    staffBlocks?: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>,
  ) {
    // Reset hit rects each frame
    this.rects = {}

    // Rim highlight on the right edge
    const rim = new Graphics()
    rim.rect(Math.max(0, width) - 1, 0, 1, Math.max(0, screenH))
    rim.fill({ color: 0xffffff, alpha: 0.08 })
    ui.addChild(rim)

    // Resize grip area (invisible but hit-testable)
    const gripW = UI_CONSTANTS.SPACING.SMALL
    const gripX = Math.max(0, width) - gripW
    this.rects['sb:resize'] = { x: gripX, y: 0, w: gripW, h: Math.max(0, screenH) }

    // Staff labels
    if (staffs && staffBlocks) {
      for (const sb of staffBlocks) {
        const staff = staffs.find(s => s.id === sb.id)
        if (!staff) continue
        const key = `staff:${staff.id}`
        const label: any = this.labels[key] ?? (this.labels[key] = new Text({ text: '', style: { fill: 0xb3b3b3, fontSize: 12 } }))
        label.text = staff.name
        label.x = UI_CONSTANTS.SIDEBAR.PADDING
        // center vertically within staff block
        const cy = sb.yTop + (sb.yBottom - sb.yTop) / 2
        label.y = Math.round(cy - (label.height || 12) / 2)
        ui.addChild(label)

        // clickable rect for future interactions
        const h = Math.max(UI_CONSTANTS.SPACING.ROW_HEIGHT - 4, (sb.yBottom - sb.yTop))
        this.rects[key] = { x: 0, y: Math.round(sb.yTop), w: Math.max(0, width), h }
      }

      // Prune labels for staffs that were removed
      const validKeys = new Set(staffs.map(s => `staff:${s.id}`))
      for (const [k, t] of Object.entries(this.labels)) {
        if (!validKeys.has(k)) {
          try { if ((t as any).parent) (t as any).parent.removeChild(t) } catch {}
          try { (t as any).destroy?.() } catch {}
          delete this.labels[k]
        }
      }
    }
  }

  // Back-compat: if called, render both on the same container (not used by Renderer)
  render(
    ui: Container,
    screenH: number,
    width: number,
    staffs?: Staff[],
    staffBlocks?: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>,
    _mouse?: { x: number | null; y: number | null }
  ) {
    this.renderBackground(ui, screenH, width)
    this.renderForeground(ui, screenH, width, staffs, staffBlocks)
  }

  hitTest(x: number, y: number): string | null {
    return firstHit(this.rects, x, y)
  }
}
