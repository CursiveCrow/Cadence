import { Application, Container, Filter, GlProgram, Graphics, Rectangle } from 'pixi.js'

export type TimeScale = 'hour' | 'day' | 'week' | 'month'

function hexToRgb01(hex: number): { r: number; g: number; b: number } {
    const r = ((hex >> 16) & 0xff) / 255
    const g = ((hex >> 8) & 0xff) / 255
    const b = (hex & 0xff) / 255
    return { r, g, b }
}

/**
 * GPU-based infinite vertical grid using a full-screen quad + fragment shader.
 * The shader computes world-space X (days) and uses modulo arithmetic to draw lines.
 */
export class GpuTimeGrid {
    container: Container
    private quad: Graphics
    private filter: Filter

    constructor(app: Application) {
        this.container = new Container()
        this.container.eventMode = 'none'

        // Full-screen quad to define filter area
        this.quad = new Graphics()
        this.container.addChild(this.quad)

        const vertex = `
      attribute vec2 aPosition;
      varying vec2 vTextureCoord;

      uniform vec4 uInputSize;
      uniform vec4 uOutputFrame;
      uniform vec4 uOutputTexture;

      void main(void) {
          gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
          vTextureCoord = aPosition;
      }
    `

        const fragment = `
      precision mediump float;
      varying vec2 vTextureCoord;

      // Screen
      uniform float uScreenWidth;
      uniform float uScreenHeight;

      // Timeline params
      uniform float uLeftMarginPx;
      uniform float uViewportXDays;
      uniform float uDayWidthPx;

      // Steps (in days)
      uniform float uMinorStepDays;
      uniform float uMajorStepDays;

      // Colors (0..1) and alpha
      uniform float uMinorR; uniform float uMinorG; uniform float uMinorB; uniform float uMinorA;
      uniform float uMajorR; uniform float uMajorG; uniform float uMajorB; uniform float uMajorA;

      // Line half-widths in pixels
      uniform float uMinorHalfWidthPx;
      uniform float uMajorHalfWidthPx;

      // Scale selector (0=hour,1=day,2=week,3=month)
      uniform float uScaleType;

      // Weekend shading (day scale only)
      uniform float uBaseDow; // 0..6 starting at projectStartDate UTC
      uniform float uWeekendAlpha; // 0 to disable
      // Global alpha to control overall subtlety
      uniform float uGlobalAlpha;

      float lineCoverage(float distPx, float halfWidthPx){
        // Fixed AA width to avoid fwidth dependency in WebGL1; smaller = softer
        float aa = 0.75;
        return 1.0 - smoothstep(halfWidthPx - aa, halfWidthPx + aa, distPx);
      }

      void main(void) {
        float screenX = vTextureCoord.x * uScreenWidth;
        float worldPxX = screenX - uLeftMarginPx;
        float worldDaysX = uViewportXDays + (worldPxX / max(uDayWidthPx, 0.0001));

        // Distances to nearest minor/major vertical line in pixels
        float tMinor = fract(worldDaysX / max(uMinorStepDays, 0.000001));
        float tMajor = fract(worldDaysX / max(uMajorStepDays, 0.000001));

        float distMinorPx = min(tMinor, 1.0 - tMinor) * (uMinorStepDays * uDayWidthPx);
        float distMajorPx = min(tMajor, 1.0 - tMajor) * (uMajorStepDays * uDayWidthPx);

        float covMinor = lineCoverage(distMinorPx, uMinorHalfWidthPx);
        float covMajor = lineCoverage(distMajorPx, uMajorHalfWidthPx);

        vec4 minorColor = vec4(uMinorR, uMinorG, uMinorB, uMinorA);
        vec4 majorColor = vec4(uMajorR, uMajorG, uMajorB, uMajorA);

        // Blend with precedence; brightness is gated by per-line alphas
        float wMajor = covMajor;
        float wMinor = max(0.0, covMinor * (1.0 - wMajor));
        float majorStrength = wMajor * majorColor.a;
        float minorStrength = wMinor * minorColor.a;
        vec3 rgb = majorColor.rgb * majorStrength + minorColor.rgb * minorStrength;
        float a = clamp(majorStrength + minorStrength, 0.0, 1.0);
        vec4 color = vec4(rgb, a);

        // Weekend bands in day scale (uScaleType == 1.0)
        if (uWeekendAlpha > 0.0 && abs(uScaleType - 1.0) < 0.5) {
          float dayIndex = floor(worldDaysX);
          float dow = mod(uBaseDow + dayIndex, 7.0);
          if (abs(dow - 0.0) < 0.5 || abs(dow - 6.0) < 0.5) {
            color.rgb = mix(color.rgb, vec3(1.0), clamp(uWeekendAlpha, 0.0, 1.0));
          }
        }

        gl_FragColor = color * uGlobalAlpha;
      }
    `

        this.filter = new Filter({
            glProgram: new GlProgram({ vertex, fragment }),
            resources: {
                grid: {
                    // Screen
                    uScreenWidth: { value: 0, type: 'f32' },
                    uScreenHeight: { value: 0, type: 'f32' },
                    // Timeline
                    uLeftMarginPx: { value: 0, type: 'f32' },
                    uViewportXDays: { value: 0, type: 'f32' },
                    uDayWidthPx: { value: 60, type: 'f32' },
                    // Steps
                    uMinorStepDays: { value: 1.0, type: 'f32' },
                    uMajorStepDays: { value: 7.0, type: 'f32' },
                    // Colors
                    uMinorR: { value: 1.0, type: 'f32' },
                    uMinorG: { value: 1.0, type: 'f32' },
                    uMinorB: { value: 1.0, type: 'f32' },
                    uMinorA: { value: 0.01, type: 'f32' },
                    uMajorR: { value: 1.0, type: 'f32' },
                    uMajorG: { value: 1.0, type: 'f32' },
                    uMajorB: { value: 1.0, type: 'f32' },
                    uMajorA: { value: 0.03, type: 'f32' },
                    // Widths
                    uMinorHalfWidthPx: { value: 0.5, type: 'f32' },
                    uMajorHalfWidthPx: { value: 1.0, type: 'f32' },
                    // Scale selector
                    uScaleType: { value: 1.0, type: 'f32' },
                    // Weekend
                    uBaseDow: { value: 0.0, type: 'f32' },
                    uWeekendAlpha: { value: 0.0, type: 'f32' },
                    // Global alpha
                    uGlobalAlpha: { value: 1.0, type: 'f32' },
                }
            }
        })

            // Apply filter to the container
            ; (this.container as any).filters = [this.filter]

        // Initialize quad to current screen
        this.setSize(app.screen.width, app.screen.height)
    }

    setSize(width: number, height: number): void {
        this.quad.clear()
        this.quad.rect(0, 0, width, height)
        // Transparent fill just to define geometry/bounds for the filter
        this.quad.fill({ color: 0x000000, alpha: 0 })
            // Ensure filter is applied across the screen area
            ; (this.container as any).filterArea = new Rectangle(0, 0, width, height)
    }

    updateUniforms(input: {
        screenWidth: number
        screenHeight: number
        leftMarginPx: number
        viewportXDays: number
        dayWidthPx: number
        minorStepDays: number
        majorStepDays: number
        minorColor: number
        majorColor: number
        minorAlpha: number
        majorAlpha: number
        minorLineWidthPx: number
        majorLineWidthPx: number
        scaleType: TimeScale
        baseDow: number
        weekendAlpha: number
        globalAlpha: number
    }): void {
        const uniforms = (this.filter.resources as any).grid.uniforms
        uniforms.uScreenWidth = input.screenWidth
        uniforms.uScreenHeight = input.screenHeight
        uniforms.uLeftMarginPx = input.leftMarginPx
        uniforms.uViewportXDays = input.viewportXDays
        uniforms.uDayWidthPx = input.dayWidthPx

        uniforms.uMinorStepDays = input.minorStepDays
        uniforms.uMajorStepDays = input.majorStepDays

        const mi = hexToRgb01(input.minorColor)
        const ma = hexToRgb01(input.majorColor)
        uniforms.uMinorR = mi.r
        uniforms.uMinorG = mi.g
        uniforms.uMinorB = mi.b
        uniforms.uMinorA = input.minorAlpha
        uniforms.uMajorR = ma.r
        uniforms.uMajorG = ma.g
        uniforms.uMajorB = ma.b
        uniforms.uMajorA = input.majorAlpha

        uniforms.uMinorHalfWidthPx = Math.max(0.25, input.minorLineWidthPx * 0.5)
        uniforms.uMajorHalfWidthPx = Math.max(0.25, input.majorLineWidthPx * 0.5)

        uniforms.uScaleType = input.scaleType === 'hour' ? 0.0 : input.scaleType === 'day' ? 1.0 : input.scaleType === 'week' ? 2.0 : 3.0
        uniforms.uBaseDow = input.baseDow
        uniforms.uWeekendAlpha = input.weekendAlpha
        uniforms.uGlobalAlpha = input.globalAlpha
    }
}

export function createGpuTimeGrid(app: Application): GpuTimeGrid {
    return new GpuTimeGrid(app)
}


