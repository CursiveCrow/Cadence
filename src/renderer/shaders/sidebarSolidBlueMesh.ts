// WGSL shader for Mesh (not a Filter). Uses Pixi v8 GlobalUniforms
// to transform positions and outputs a solid dark blue.

export const SIDEBAR_SOLID_BLUE_MESH_WGSL = /* wgsl */ `
  struct GlobalUniforms {
    uProjectionMatrix: mat3x3<f32>,
    uWorldTransformMatrix: mat3x3<f32>,
    uWorldColorAlpha: vec4<f32>,
    uResolution: vec2<f32>,
  };

  // Pixi v8 local uniforms expected by MeshPipe (group(1))
  struct LocalUniforms {
    uTransformMatrix: mat3x3<f32>,
    uColor: vec4<f32>,
    uRound: f32,
  };

  @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
  @group(1) @binding(0) var<uniform> localUniforms : LocalUniforms;

  struct VSOut {
    @builtin(position) position: vec4<f32>,
    @location(0) vUV: vec2<f32>,
  };

  @vertex
  fn mainVertex(
    @location(0) aPosition: vec2<f32>,
    @location(1) aUV: vec2<f32>
  ) -> VSOut {
    // Apply local transform first, then world + projection
    let model = localUniforms.uTransformMatrix * vec3<f32>(aPosition, 1.0);
    let world = globalUniforms.uWorldTransformMatrix * model;
    let clip = globalUniforms.uProjectionMatrix * world;
    var outV: VSOut;
    outV.position = vec4<f32>(clip.xy, 0.0, 1.0);
    outV.vUV = aUV;
    return outV;
  }

  @fragment
  fn mainFragment(
    @location(0) vUV: vec2<f32>
  ) -> @location(0) vec4<f32> {
    // Solid dark blue (#0d1b2a), premultiplied
    let color = vec4<f32>(0.05098, 0.10588, 0.16470, 1.0);
    return color;
  }
`;

// Minimal GL shaders to satisfy Mesh expecting a glProgram (not used on WebGPU)
// No GLSL fallback. This project targets WebGPU-only.
