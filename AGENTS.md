# Agent Rules for This Repo

The following rules are mandatory for all automated changes and code generation in this project.

## Rendering Engine (PixiJS v8, WebGPU only)

- WebGPU only: This project does NOT use WebGL and must not contain any WebGL or GLSL fallbacks.
- Do not import, reference, or generate any WebGL-specific APIs, types, or code paths, including but not limited to:
  - `GlProgram`, `WebGLRenderer`, `glProgram`, `gl:` options in `Filter.from` or `Shader.from`.
  - GLSL shader strings or files (e.g., `/* glsl */` sources).
- Only use WGSL for shaders and the WebGPU pipeline:
  - `Filter.from({ gpu: { vertex, fragment } })` for filters.
  - `Shader.from({ gpu: { vertex, fragment } })` for mesh shaders.
  - Uniforms and bind groups must match Pixi v8’s WebGPU expectations (GlobalUniforms for meshes, GlobalFilterUniforms for filters).
- If you believe a fallback is “needed,” do not add it. Instead, stop and request explicit approval from the human.

## Prohibited Patterns

- Do not add any of the following keys in code: `glProgram`, `gl:`, `glsl` sources.
- Do not add any imports or dependencies related to WebGL fallback packages.
- Do not generate dual-pipeline shaders (no combined GLSL/WGSL modules). WGSL only.

## Acceptable Shader Patterns

- Filters: WGSL with `GlobalFilterUniforms`, `uTexture`, `uSampler`, with entries provided to `Filter.from({ gpu: ... })`.
- Meshes: WGSL with `GlobalUniforms` (e.g., `uProjectionMatrix`, `uWorldTransformMatrix`) via `Shader.from({ gpu: ... })`.

## Review Checklist (for any rendering change)

1. No GL/GLSL imports or fallbacks present.
2. Only WGSL shader sources used.
3. Only `gpu:` program descriptors used.
4. No `glProgram` keys, no `gl:` sections.
5. Shaders respect Pixi v8 WGSL uniform layouts.

These rules are strict. Violations should be treated as regressions and corrected immediately.
