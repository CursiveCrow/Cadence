export const WGSL_GRID_LINE_FUNCS = `
fn fractf(x: f32) -> f32 { return x - floor(x); }

fn lineCoverage(distPx: f32, halfWidthPx: f32) -> f32 {
  let aa = 0.75;
  return 1.0 - smoothstep(halfWidthPx - aa, halfWidthPx + aa, distPx);
}

fn computeWorldDaysX(screenX: f32) -> f32 {
  let worldPxX = screenX - grid.uLeftMarginPx;
  return grid.uViewportXDays + (worldPxX / max(grid.uDayWidthPx, 0.0001));
}

fn computeGridDistances(worldDaysX: f32) -> vec2<f32> {
  let qMinor = worldDaysX / max(grid.uMinorStepDays, 0.000001);
  let qMajor = worldDaysX / max(grid.uMajorStepDays, 0.000001);
  let tMinor = fractf(qMinor);
  let tMajor = fractf(qMajor);

  let distMinorPx = min(tMinor, 1.0 - tMinor) * (grid.uMinorStepDays * grid.uDayWidthPx);
  let distMajorPx = min(tMajor, 1.0 - tMajor) * (grid.uMajorStepDays * grid.uDayWidthPx);
  return vec2<f32>(distMinorPx, distMajorPx);
}
`;

