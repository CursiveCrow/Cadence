## Cadence Project Management Strategy

This strategy turns delivery planning into a musical score. Work is represented as notes on staves; time flows left to right. The metaphors are deliberate: they reward alignment (harmony), clear tempo (cadence), and constraint (measures and lines) to focus the team.

### Objectives

- Deliver predictably with tight feedback loops and visible constraints
- Make planning and replanning fast, visual, and collaborative
- Reduce coordination cost across roles by grouping related work
- Instrument flow to continuously improve throughput and quality

## Core Concepts

### Tasks (Notes)

- Atomic units of work with a start date, duration, status, staff, and an optional markdown description
- Drawn as a note body for quick recognition; status glyph conveys state at a glance
- Interact via drag, resize, and dependency linking

### Staffs

- Horizontal lanes representing teams, products, areas, or value streams
- Maintain stable ordering so the score is learnable
- Each staff can define line labels, policies, and capacity

### Staff Lines (WIP/Stages/Lanes)

- Vertical snap grid within a staff
- Use lines to encode one of:
  - WIP slots (one concurrent task per line)
  - Sub‑roles/individuals (lines map to people or subteams)
  - Workflow stages (Design → Build → QA → Ready)
  - Priority lanes (Urgent/Committed/Stretch)
- Policies per line: wipLimit, allowedStatuses, autoAssignee, stage transitions

### Measures (Time Containers)

- Fixed‑length bars (e.g., 1–2 weeks) with labeled boundaries
- Purpose:
  - Create a planning cadence with explicit commit/review points
  - Enable capacity planning per staff/line per measure
  - Quantize changes: new work and scope changes snap to boundaries (soft policy)
- Analytics: velocity per measure, overfill warnings, exceptions list

### Chords (Cross‑Task Bundles)

- Group tasks that should “move together” across staffs
- Policies: startTogether, finishTogether, mustOverlap, sequence
- Benefits: swarming, simpler dependencies, clearer release slices
- UI: chord brackets with a handle; bulk drag to re‑time the bundle

## Governance & Cadence

- Measure planning: define goals, capacity, and the chords scheduled for the bar
- In‑measure policy: minimize new work; prioritize finishing and removing blockers
- Review at boundaries: play back the score (what shipped), capture lessons learned, reset capacity

## Planning and Execution

1. Compose the roadmap with measures × chords (time × bundles)
2. Place tasks on staffs/lines using WIP/role/stage conventions
3. Manage by exception:
   - Over‑capacity lines/measure overfill
   - Chord policy violations
   - Drift outside measures
4. Rehearse (dry run) high‑risk chords before the measure starts

## Metrics (Flow and Quality)

- Throughput per measure (tasks completed, chords completed)
- Velocity per staff/line; line WIP utilization
- Lead/cycle time per stage (time on a line), handoffs per chord
- p95 frame time at day/hour scale (UX perf), edit latency, crash rate
- Forecast accuracy: planned vs achieved per measure/chord

## Data Model (Conceptual)

- Task { id, title, startDate, durationDays, status, staffId, staffLine, description?, dependencies[] }
- Staff { id, name, numberOfLines, lineLabels[], linePolicies[] }
- Measure { id, index, startDay, lengthDays, label, goals?, capacity? }
- Chord { id, label, color?, taskIds[], policy, targetMeasureId? }

## UI Principles

- Two‑row ruler (Month | Week/Day/Hour); clear measure boundaries
- Subtle weekend/after‑hours tint; visible “Today” marker and zoom controls
- Line labels and WIP chips (e.g., "2/3"); load heat strip per line
- Chord brackets hover with summary; inspector for chord policies and readiness
- Sticky header; inline edits; sidebar inspector for rich details (markdown)

## Constraints Engine (Policies)

- Validate on edits and on schedule:
  - Line WIP limit breaches
  - Chord policy violations (e.g., a task strays outside the chord’s measure)
  - Measure overfill by capacity
- Errors become actionable warnings with one‑click fixes (e.g., “Move task to next measure”)

## Process & Adoption

1. Introduce measures (timeboxes) and review rituals first
2. Enable line labels and WIP chips; agree on lane semantics per staff
3. Pilot chords on 1–2 cross‑functional features; expand after first retro
4. Instrument metrics; publish a weekly scorecard by measure

## Risks and Mitigations

- Over‑rigidity: keep policies soft (warnings) until the team is ready
- Visual overload: progressive disclosure; hide overlays by default, surface on hover/inspector
- Estimation drift: prefer capacity/velocity by measure over point estimates; treat measures as forecasts, not commitments

## Roadmap (Phased)

### Phase 1 (2–3 weeks)

- Staff line labels + WIP chips and heat strips
- Measure header row and soft measure snapping
- Basic chord groups with startTogether; chord brackets + bulk drag

### Phase 2 (3–5 weeks)

- Constraints engine warnings; batch edits by chord
- Capacity planning per measure; velocity and exceptions report
- Sidebar inspector with markdown and quick actions

### Phase 3 (ongoing)

- Policy automation (auto‑assignee on stage transition)
- Release trains (sequences of chords) and scenario planning
- Visual regression + perf CI for day/hour scales; plugin API hardening

## Success Criteria

- Predictability: ≥90% chords finish in their planned measure
- Flow: WIP breaches trend down; lead time per stage decreases across measures
- UX: p95 frame < 16ms on day scale in typical scenarios; drag/edit latency < 100ms
- Adoption: teams plan and review at measure boundaries; swarming on chords is observed in usage
