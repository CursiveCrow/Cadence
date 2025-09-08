import { Container, Graphics, Text, Filter, GpuProgram, UniformGroup, Sprite, Texture } from 'pixi.js'
import { firstHit } from '@shared/geom'
import { getCssVarColor } from '@shared/colors'
import { SIDEBAR, SPACING } from '@config/ui'
import type { Staff } from '@types'

export class SidebarRenderer {
  private bgSprite?: Sprite
  private rects: Record<string, { x: number; y: number; w: number; h: number }> = {}
  private labels: Record<string, Text> = {}
  private inkFilter?: Filter
  private inkUniforms?: UniformGroup<any>
  private startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000

  render(
    ui: Container,
    screenH: number,
    width: number,
    staffs?: Staff[],
    staffBlocks?: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>,
    mouse?: { x: number | null; y: number | null }
  ) {
    // Setup WGSL ink shader (once)
    if (!this.inkFilter) {
      const wgsl = `
        struct GlobalFilterUniforms {
          uInputSize:vec4<f32>,
          uInputPixel:vec4<f32>,
          uInputClamp:vec4<f32>,
          uOutputFrame:vec4<f32>,
          uGlobalFrame:vec4<f32>,
          uOutputTexture:vec4<f32>,
        };

        struct InkUniforms {
          uData0 : vec4<f32>, // x: time, y: intensity
          uData1 : vec4<f32>, // x: mouseX (0..1), y: mouseY (0..1), z: radius
        };

        @group(0) @binding(0) var<uniform> gfu : GlobalFilterUniforms;
        @group(0) @binding(1) var uTexture: texture_2d<f32>;
        @group(0) @binding(2) var uSampler : sampler;
        @group(1) @binding(0) var<uniform> ink : InkUniforms;

        struct VSOut { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };

        fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
        {
          var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
          position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
          position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
          return vec4(position, 0.0, 1.0);
        }

        fn filterTextureCoord(aPosition:vec2<f32>) -> vec2<f32>
        {
          return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
        }

        @vertex fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOut {
          return VSOut(filterVertexPosition(aPosition), filterTextureCoord(aPosition));
        }

        @fragment fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
          var color = textureSample(uTexture, uSampler, uv);

          // Un-premultiply
          if (color.a > 0.0) { color.rgb /= color.a; }

          // Spotlight in UV space
          let m = ink.uData1.xy;
          let radius = max(0.001, ink.uData1.z);
          let d = distance(uv, m);
          let light = exp(- (d / radius) * 8.0);
          let glow = vec3<f32>(0.35, 0.28, 0.20) * light * ink.uData0.y;
          color.rgb = clamp(color.rgb + glow, vec3<f32>(0.0), vec3<f32>(1.0));

          // Re-premultiply
          color.rgb *= color.a;
          return color;
        }
      `

      this.inkUniforms = new UniformGroup({
        // uData0: time, intensity
        uData0: { value: new Float32Array([0, 1, 0, 0]), type: 'vec4<f32>' },
        // uData1: mouseX_norm, mouseY_norm, radius
        uData1: { value: new Float32Array([0.5, 0.5, 1.0, 0]), type: 'vec4<f32>' },
      }, { ubo: true })

      const gpuProgram = GpuProgram.from({
        vertex: { source: wgsl, entryPoint: 'mainVertex' },
        fragment: { source: wgsl, entryPoint: 'mainFragment' },
        name: 'ink-sidebar'
      })

      this.inkFilter = new Filter({ gpuProgram, resources: { ink: this.inkUniforms } })
    }

    // Solid base to ensure opaque sidebar; use a sprite for reliable filter support.
    if (!this.bgSprite) {
      this.bgSprite = new Sprite({ texture: Texture.WHITE })
    }
    this.bgSprite.x = 0; this.bgSprite.y = 0
    this.bgSprite.width = Math.max(0, width)
    this.bgSprite.height = Math.max(0, screenH)
    this.bgSprite.tint = getCssVarColor('--ui-color-bg', 0x111112)

    // Update uniforms and apply filter each frame
    if (this.inkFilter && this.inkUniforms) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000
      const t = now - this.startTime
      const u: any = this.inkUniforms
      // time and intensity
      const d0 = u.uniforms.uData0 as Float32Array
      d0[0] = t
      d0[1] = 1.0
      // normalized mouse and radius
      const d1 = u.uniforms.uData1 as Float32Array
      const mx = Math.max(0, Math.min(width, (mouse?.x ?? width * 0.5))) / Math.max(1, width)
      const my = Math.max(0, Math.min(screenH, (mouse?.y ?? screenH * 0.5))) / Math.max(1, screenH)
      d1[0] = mx
      d1[1] = my
      d1[2] = 0.6
      ;(this.bgSprite as any).filters = [this.inkFilter]
    }
    ui.addChild(this.bgSprite)

    // simple rim highlight
    // reset rects once at start of frame
    this.rects = {}

    const rim = new Graphics()
    rim.rect(Math.max(0, width) - 1, 0, 1, Math.max(0, screenH))
    rim.fill({ color: 0xffffff, alpha: 0.08 })
    // Resize grip area (invisible but hit-testable)
    const gripW = SPACING.SMALL
    const gripX = Math.max(0, width) - gripW
    this.rects['sb:resize'] = { x: gripX, y: 0, w: gripW, h: Math.max(0, screenH) }
    ui.addChild(rim)

    // Staff labels
    if (staffs && staffBlocks) {
      for (const sb of staffBlocks) {
        const staff = staffs.find(s => s.id === sb.id)
        if (!staff) continue
        const key = `staff:${staff.id}`
        const label: any = this.labels[key] ?? (this.labels[key] = new Text({ text: '', style: { fill: 0xb3b3b3, fontSize: 12 } }))
        label.text = staff.name
        label.x = SIDEBAR.PADDING
        // center label vertically within staff
        const cy = sb.yTop + (sb.yBottom - sb.yTop) / 2
        label.y = Math.round(cy - (label.height || 12) / 2)
        ui.addChild(label)

        // clickable rect for future interactions
        const h = Math.max(SPACING.ROW_HEIGHT - 4, (sb.yBottom - sb.yTop))
        this.rects[key] = { x: 0, y: Math.round(sb.yTop), w: Math.max(0, width), h }
      }
    }
  }

  hitTest(x: number, y: number): string | null {
    return firstHit(this.rects, x, y)
  }
}









