import { Application, Container, Filter, GpuProgram, Graphics, Rectangle, UniformGroup } from 'pixi.js'
import { WGSL_GRID_LINE_FUNCS } from './gridShader'

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

    const wgsl = `
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

struct GridUniforms {
  uScreenWidth: f32,
  uScreenHeight: f32,
  uLeftMarginPx: f32,
  uViewportXDays: f32,
  uDayWidthPx: f32,
  uMinorStepDays: f32,
  uMajorStepDays: f32,
  uMinorR: f32, uMinorG: f32, uMinorB: f32, uMinorA: f32,
  uMajorR: f32, uMajorG: f32, uMajorB: f32, uMajorA: f32,
  uMinorHalfWidthPx: f32,
  uMajorHalfWidthPx: f32,
  uScaleType: f32,
  uBaseDow: f32,
  uWeekendAlpha: f32,
  uGlobalAlpha: f32,
  uBandAlpha: f32,
};

@group(1) @binding(0) var<uniform> grid : GridUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
};

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return vec4<f32>(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition:vec2<f32>) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>,
) -> VSOutput {
  return VSOutput(
    filterVertexPosition(aPosition),
    filterTextureCoord(aPosition)
  );
}

${WGSL_GRID_LINE_FUNCS}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>, @builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let screenX = position.x;
  // Use shared helpers to compute world coordinate and distances
  let worldDaysX = computeWorldDaysX(screenX);
  let dists = computeGridDistances(worldDaysX);
  let distMinorPx = dists.x;
  let distMajorPx = dists.y;

  let covMinor = lineCoverage(distMinorPx, grid.uMinorHalfWidthPx);
  let covMajor = lineCoverage(distMajorPx, grid.uMajorHalfWidthPx);

  let minorColor = vec4<f32>(grid.uMinorR, grid.uMinorG, grid.uMinorB, grid.uMinorA);
  let majorColor = vec4<f32>(grid.uMajorR, grid.uMajorG, grid.uMajorB, grid.uMajorA);

  let wMajor = covMajor;
  let wMinor = max(0.0, covMinor * (1.0 - wMajor));
  let majorStrength = wMajor * majorColor.a;
  let minorStrength = wMinor * minorColor.a;
  let rgb = majorColor.rgb * majorStrength + minorColor.rgb * minorStrength;
  var color = vec4<f32>(rgb, clamp(majorStrength + minorStrength, 0.0, 1.0));

  // Alternating day bands (very subtle) for readability at day/week scales
  if (grid.uBandAlpha > 0.0 && (abs(grid.uScaleType - 1.0) < 0.5 || abs(grid.uScaleType - 2.0) < 0.5)) {
    let dayIndex = i32(floor(worldDaysX));
    if ((dayIndex & 1) != 0) {
      let a = clamp(grid.uBandAlpha, 0.0, 1.0);
      let newRgb = color.rgb * (1.0 - a) + vec3<f32>(1.0, 1.0, 1.0) * a;
      color = vec4<f32>(newRgb, color.a);
    }
  }

  // Weekend tint active for day (1.0) and hour (0.0) scales
  if (grid.uWeekendAlpha > 0.0 && (abs(grid.uScaleType - 1.0) < 0.5 || abs(grid.uScaleType - 0.0) < 0.5)) {
    let dayIndex = floor(worldDaysX);
    let dowi: i32 = (i32(grid.uBaseDow) + i32(dayIndex)) % 7;
    let dow: f32 = f32(dowi);
    if (abs(dow - 0.0) < 0.5 || abs(dow - 6.0) < 0.5) {
      let a = clamp(grid.uWeekendAlpha, 0.0, 1.0);
      let newRgb = color.rgb * (1.0 - a) + vec3<f32>(1.0, 1.0, 1.0) * a;
      color = vec4<f32>(newRgb, color.a);
    }
  }

  return color * grid.uGlobalAlpha;
}
    `

    this.filter = new Filter({
      gpuProgram: GpuProgram.from({
        vertex: { source: wgsl, entryPoint: 'mainVertex' },
        fragment: { source: wgsl, entryPoint: 'mainFragment' }
      }),
      resources: {
        grid: new UniformGroup({
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
          // Alternating band alpha (subtle)
          uBandAlpha: { value: 0.04, type: 'f32' },
        })
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
    bandAlpha?: number
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
    uniforms.uBandAlpha = (input.bandAlpha ?? 0.04)
  }
}

export function createGpuTimeGrid(app: Application): GpuTimeGrid {
  return new GpuTimeGrid(app)
}

