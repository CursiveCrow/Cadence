Below is the **Markdown version** of the complete atomic tasklist.
Each row includes **ID**, **Task**, **Description**, **Deliverables**, **Acceptance Criteria (AC)**, and **Dependencies** (by ID).

> **Legend:**
> **IDs:** `T0xx` (Repo/Tooling), `T1xx` (Domain/Data), `T2xx` (Scheduler), `T3xx` (UI Score), `T4xx` (Infra/Calendar), `T5xx` (Tests/QA), `T6xx` (CI/Packaging), `T7xx` (Docs), `T8xx` (Security), `T9xx` (Perf & A11y).
> **Atomic** = completable by one engineer without external blockers (≈1–2h), produces a verifiable artifact.

---

# **Part 1 of 3 — Tasks T000–T199**

## 0) Repository & Environment (T000–T009)

| ID   | Task                                      | Description                                                                                                                                 | Deliverables                                                       | Acceptance Criteria                                           | Dependencies |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- | ------------ |
| T000 | Verify .NET 10 preview SDK availability   | Ensure `dotnet --list-sdks` shows a 10.0.x preview; install if missing.                                                                     | Screenshot/log in issue; version recorded in README prerequisites. | `dotnet new console -f net10.0` succeeds locally.             | —            |
| T001 | Pin SDK via `global.json`                 | Create/adjust `global.json` with `rollForward: latestMajor`, `allowPrerelease: true`.                                                       | `global.json` committed.                                           | `dotnet --info` selects .NET 10 preview for the repo.         | T000         |
| T002 | Initialize solution skeleton              | Create solution and projects: `Cadence.Domain`, `Cadence.Application`, `Cadence.Infrastructure`, `Cadence.App` (Avalonia), `Cadence.Tests`. | `Cadence.sln`, csproj files targeting `net10.0`.                   | `dotnet build` succeeds.                                      | T001         |
| T003 | Add `.editorconfig` & `.gitignore`        | Enforce code style; ignore build artifacts, SQLite WAL files.                                                                               | Root `.editorconfig`, `.gitignore`.                                | Tools honor formatting; `git status` clean after build.       | T002         |
| T004 | Add MIT `LICENSE` & README skeleton       | Include license and a minimal README with prerequisites and run steps.                                                                      | `LICENSE`, `README.md`.                                            | Files present; CI license scan passes (later).                | T002         |
| T005 | Avalonia packages & bootstrapping         | Add `Avalonia`, `Avalonia.Desktop`, `Avalonia.ReactiveUI`, `CommunityToolkit.Mvvm` to `Cadence.App`.                                        | Updated csproj, `App.axaml`, `MainWindow.axaml`.                   | `dotnet run --project src/Cadence.App` opens an empty window. | T002         |
| T006 | Test framework plumbing                   | Add `xunit`, `FluentAssertions`, `Microsoft.NET.Test.Sdk`; one “green” test.                                                                | `Cadence.Tests` builds & runs.                                     | `dotnet test` passes with at least one sample test.           | T002         |
| T007 | Repo scripts                              | Add `build.sh/.ps1`, `test.sh/.ps1` convenience scripts.                                                                                    | Scripts in root.                                                   | Scripts succeed on Win/macOS/Linux.                           | T002         |
| T008 | Enable SQLite native dependency readiness | Add notes and package references needed for SQLite (if EF later).                                                                           | Notes in README, placeholder package refs if using EF.             | Build still green.                                            | T002         |
| T009 | Add sample `fixtures/sample-piece.json`   | Provide seed JSON consistent with spec.                                                                                                     | `fixtures/sample-piece.json`.                                      | File loads in app stub (later T140).                          | T002         |

## 1) Domain: Value Objects & Entities (T050–T059)

| ID   | Task                                | Description                                                                            | Deliverables                 | Acceptance Criteria                                          | Dependencies |
| ---- | ----------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ | ------------ |
| T050 | `Beats` and `Minutes` value objects | Immutable records with helpers; conversions via tempo.                                 | `ValueObjects.cs` in Domain. | Unit test verifies conversions & formatting.                 | T006         |
| T051 | Core enums                          | `NoteStatus {Planned, InProgress, Blocked, Done}`, `ScheduleMode {Forward, Backward}`. | `Enums.cs`.                  | Compiles; referenced by entities.                            | T050         |
| T052 | `Piece` entity                      | Properties per spec; collections for Measures, Chords, Notes, Dependencies.            | `Entities.Piece.cs`.         | Can be instantiated from seed DTOs.                          | T051         |
| T053 | `Measure` entity                    | Index, Start/EndUtc, CapacityBeats, Availability, Label.                               | `Entities.Measure.cs`.       | Constructed from daily generator; equality by Id.            | T052         |
| T054 | `Chord` entity                      | Name, Priority, Color, soft due window.                                                | `Entities.Chord.cs`.         | Accepts null soft due; aggregates compute later.             | T052         |
| T055 | `Note` entity                       | Title, DurationBeats, status, optional windows & locks, optional `ChordId`.            | `Entities.Note.cs`.          | Validates no negative durations; status defaults to Planned. | T052         |
| T056 | `Dependency` entity                 | PredecessorNoteId → SuccessorNoteId.                                                   | `Entities.Dependency.cs`.    | Self‑dependency forbidden by validation.                     | T055         |
| T057 | Schedule result types               | `ScheduledNote`, `ScheduleSnapshot` immutable.                                         | `Scheduling.Types.cs`.       | JSON serialization works (round‑trip test).                  | T051         |
| T058 | Domain invariants (guards)          | Add lightweight guard methods for null/empty/negative.                                 | `Domain.Guards.cs`.          | Guard tests pass.                                            | T050–T057    |
| T059 | Seed DTOs                           | DTOs matching `fixtures/sample-piece.json` to map into domain.                         | `SeedDtos.cs`.               | Deserialize and map successfully (test).                     | T009         |

## 2) Data: Persistence Contracts & Schema (T100–T109)

| ID   | Task                         | Description                                                                                                          | Deliverables                                              | Acceptance Criteria                                         | Dependencies |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| T100 | Choose data approach for v1  | Decide EF Core vs Dapper for v1 (recommend EF Core).                                                                 | ADR note `docs/adr/0001-data-access.md`.                  | Decision recorded with trade‑offs.                          | T004         |
| T101 | Define repository interfaces | `IPieceRepository`, `INoteRepository`, `IDependencyRepository`, `ISnapshotRepository`, `ICalendarBindingRepository`. | Interfaces in `Cadence.Application` (ports).              | Compiles; used by app service stubs.                        | T052–T057    |
| T102 | Write SQLite DDL             | Translate spec DDL into migration‑ready script.                                                                      | `sql/schema.sql`.                                         | `sqlite3` can apply schema; `PRAGMA foreign_keys=ON`.       | T100         |
| T103 | Enable WAL & `busy_timeout`  | App open mode uses WAL; set sensible `busy_timeout`.                                                                 | Infrastructure helper (`SqliteOptions`).                  | Verified via pragma queries.                                | T102         |
| T104 | Implement EF Core DbContext  | Map entities/tables, conversions for value objects.                                                                  | `CadenceContext.cs`, `OnModelCreating` with keys/indices. | `dotnet ef database update` succeeds.                       | T100, T102   |
| T105 | Initial migration            | Generate and apply initial migration.                                                                                | `Migrations/Initial.cs`.                                  | Database file created; tables match spec.                   | T104         |
| T106 | Repositories (impl)          | Implement repository interfaces with EF/Dapper.                                                                      | Classes under `Cadence.Infrastructure`.                   | CRUD tests pass for Piece/Note/Dependency/Snapshot/Binding. | T101, T105   |
| T107 | Snapshot store               | Persist `ScheduleSnapshot` & `ScheduledNote` in one transaction.                                                     | `SqliteSnapshotRepository`.                               | Round‑trip test retains exact times.                        | T106         |
| T108 | Import/Export JSON           | Serialize/deserialize full project with stable IDs.                                                                  | `ProjectJsonSerializer`.                                  | Export→import yields identical graph (deep compare).        | T106         |
| T109 | ICS export                   | Minimal ICS generator for milestones/due windows.                                                                    | `IcsExporter`.                                            | ICS validated by major calendars.                           | T108         |

## 3) Scheduling Foundations (T130–T149)

| ID   | Task                        | Description                                                                                               | Deliverables                                       | Acceptance Criteria                                   | Dependencies     |
| ---- | --------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| T130 | DAG builder & validation    | Build adjacency lists; detect cycles (Kahn & DFS) with **explicit cycle path**.                           | `Graph.DagValidator.cs`.                           | Tests: no cycle passes; cycle returns concrete path.  | T056             |
| T131 | Topological ordering        | Deterministic order with stable tiebreakers (title, GUID).                                                | `Graph.TopologicalSort.cs`.                        | Order stable across runs.                             | T130             |
| T132 | CPM forward pass            | Compute ES/EF in beats over DAG using note durations.                                                     | `Cpm.Forward.cs`.                                  | Tests match hand‑computed examples.                   | T131             |
| T133 | CPM backward & slack        | Compute LS/LF anchored to project length; Slack = LS−ES.                                                  | `Cpm.Backward.cs`.                                 | Critical path (Slack=0) matches expected.             | T132             |
| T134 | Feasibility check           | Sum capacity across measures (minus buffers); compare to critical path beats; produce deficit diagnostic. | `Feasibility.Checker.cs`.                          | Infeasible plans return deficit and CP chain.         | T133             |
| T135 | SSGS scaffold               | Ready set, priority rule plug‑ins, placement hooks; **no capacity yet**.                                  | `Ssgs.Core.cs`.                                    | Places in topo order; smoke tests.                    | T131             |
| T136 | Measure iterator & ties     | Walk measures, track capacity, split durations across boundaries (ties).                                  | `Schedule.MeasureCursor.cs`.                       | Unit test ties across 2–3 measures accurately.        | T135             |
| T137 | Lock handling               | Respect `LockedMeasureIndex` or `LockedSpanUtc`; reject violating placements.                             | Lock evaluator.                                    | Tests: locked items fixed; conflicts reported.        | T135             |
| T138 | Windows handling            | Earliest start clamp; due window validation; diagnostic if unsatisfiable.                                 | Window evaluator.                                  | Tests pass.                                           | T135             |
| T139 | Buffers reduce capacity     | Apply per‑measure buffer beats to capacity during placement.                                              | Buffer integration in cursor.                      | Overfill beyond (capacity−buffer) forbidden by tests. | T136             |
| T140 | Minimal scheduler → UI      | Wire simple ASAP scheduler to app; display note pills from seed.                                          | VM `RunSchedulerCommand` updates displayed notes.  | Notes render with widths; window displays them.       | T005, T059       |
| T141 | Deterministic priority rule | Implement rule: min slack → earliest due → longest processing time (+ stable tiebreak).                   | `Ssgs.PriorityRules.cs`.                           | Property tests show deterministic ordering.           | T133, T135       |
| T142 | ASAP w/ capacity & ties     | Extend SSGS to honor capacity (beats/measure) and implement ties.                                         | `Ssgs.Asap.cs`.                                    | Tests for spanning notes, boundaries.                 | T136, T139, T141 |
| T143 | ALAP placement              | Latest feasible finish meeting deadline.                                                                  | `Ssgs.Alap.cs`.                                    | Symmetric behavior where feasible (tests).            | T142             |
| T144 | Infeasibility diagnostics   | Aggregate reasons with concrete lists (notes/locks/windows).                                              | `Ssgs.Diagnostics.cs`.                             | Unit tests for each failure class.                    | T137, T138, T142 |
| T145 | `IScheduler` façade         | Compose CPM + SSGS + diagnostics behind `IScheduler.RunAsync`.                                            | `SingleResourceScheduler.cs`.                      | Domain tests pass; UI stub still green.               | T132–T144        |
| T146 | Snapshot creation & persist | Persist `ScheduleSnapshot` atomically after run.                                                          | `SnapshotService` + repo calls.                    | Round‑trip equals in‑memory schedule.                 | T107, T145       |
| T147 | Golden fixtures             | 5 JSON inputs + expected snapshot JSON; diff test.                                                        | `tests/fixtures/*.json`, `ScheduleGoldenTests.cs`. | `dotnet test` validates all goldens.                  | T145, T146       |
| T148 | Property tests (DAGs)       | Random DAGs ≤ 40 notes; assert: no overlaps, capacity respected, deps upheld.                             | `SchedulePropertyTests.cs`.                        | 100 seeds pass in < 30s.                              | T142             |
| T149 | Performance budget test     | 500 notes scheduled < 3s on CI Linux runner.                                                              | `SchedulePerfTests.cs`.                            | Test passes consistently.                             | T145             |

---

# **Part 2 of 3 — Tasks T200–T499**

## 4) Unified Score View (time + structure) (T200–T215)

| ID   | Task                         | Description                                                                                           | Deliverables                                 | Acceptance Criteria                               | Dependencies |
| ---- | ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ------------ |
| T200 | Score layout scaffold        | Grid rows: chord ribbon; measure header; canvas for notes & overlay.                                  | `MainWindow.axaml` structure, VM properties. | Sections laid out as per spec.                    | T005         |
| T201 | Measure headers & capacity   | Bind Measures to headers; show date + `cap: N beats`.                                                 | XAML data template + VM `Measures`.          | Seed shows headings with capacities.              | T200, T140   |
| T202 | Note pill rendering          | ItemsControl→Canvas; bind `Canvas.Left`, `Canvas.Top`, Width from schedule.                           | Data template for pills.                     | Pills visible and sized/placed.                   | T140         |
| T203 | Chord ribbon                 | Render chord badges; stable order (priority).                                                         | Ribbon ItemsControl.                         | Chords appear; names readable.                    | T200, T055   |
| T204 | Selection state & command    | Click pill selects; Enter/Space select; Esc clears.                                                   | `SelectedNote`, `SelectNoteCommand`.         | Selection toggles visually (opacity).             | T202         |
| T205 | Structural overlay           | Draw Note→Chord elbows and Chord→Piece line (behind pills).                                           | `EdgeVm` list with `Path` geometries.        | Lines render & scroll with canvas.                | T203, T204   |
| T206 | Dependency overlay toggle    | Thin curves for Note→Note deps; checkbox & `D` key.                                                   | `ShowDependencies` flag; overlay builder.    | Toggle shows/hides curves.                        | T205         |
| T207 | Edge bundling toggle         | Per‑chord vertical spine + “fishbone” elbows from notes; `B` key.                                     | Bundled overlay builder.                     | Bundled mode reduces clutter; no z‑fighting.      | T205         |
| T208 | Align‑by‑schedule toggle     | Nudge X of structural anchors by scheduled start; not a second timeline.                              | `AlignBySchedule` affects anchor calc.       | Toggling nudges edges; pills unchanged.           | T205         |
| T209 | Critical‑only filter         | Use CPM slack (ignoring capacity) to mark `IsCritical`; show only critical notes; `K` key.            | Filtered `VisibleNotes` + overlay recompute. | Only critical chain remains; selection works.     | T133, T204   |
| T210 | Accessibility labels         | `AutomationProperties.Name` includes title, beats, chord, “critical path”; `HelpText` with shortcuts. | Added to pill template.                      | Screen reader announces expected text.            | T202, T209   |
| T211 | Keyboard map & handlers      | `D` deps, `B` bundling, `K` critical‑only, `A` align‑by‑schedule; arrow key nav.                      | Input bindings & handlers.                   | Verified by manual test plan.                     | T206–T209    |
| T212 | Drag‑to‑lock                 | Dragging pill snaps to measure; updates lock; re‑schedule.                                            | Behavior + VM method to persist lock.        | Pill repositions after schedule; lock persists.   | T145, T202   |
| T213 | Resize‑to‑change‑beats       | Grips change `DurationBeats`; command updates model & reschedules.                                    | Resize adorners; validation.                 | New width reflects updated beats; valid schedule. | T212         |
| T214 | Overlay dimming on selection | Selected note & chord path full opacity; others dim.                                                  | Opacity rules in EdgeVm & NoteVm.            | Emphasis accurate; toggling selection updates.    | T204, T205   |
| T215 | Virtualization/perf tune     | Avoid layout thrash; reuse geometry; throttle recompute.                                              | Debounce; cached geometry per chord.         | 500‑note scene smooth (≥45 FPS).                  | T205–T214    |

## 5) Application Layer (Use‑Cases & Services) (T300–T305)

| ID   | Task                    | Description                                                       | Deliverables          | Acceptance Criteria                           | Dependencies |
| ---- | ----------------------- | ----------------------------------------------------------------- | --------------------- | --------------------------------------------- | ------------ |
| T300 | Use‑case: CreatePiece   | Generates daily measures start→deadline with capacity & tempo.    | `CreatePieceHandler`. | Unit test: count of measures & dates correct. | T053, T101   |
| T301 | Use‑case: AddNote       | Validates duration, creates note, optional chord link.            | `AddNoteHandler`.     | Note persisted via repo.                      | T106         |
| T302 | Use‑case: AddDependency | Adds dep if no cycle would result; else explicit potential cycle. | Handler + tests.      | Cycle prevention verified.                    | T130, T106   |
| T303 | Use‑case: RunSchedule   | Calls `IScheduler`, persists snapshot; returns diagnostics.       | Handler + DTO.        | Golden tests pass through handler.            | T145, T146   |
| T304 | Use‑case: LockNote      | Apply measure/span lock and re‑schedule.                          | Handler.              | Locked note position fixed.                   | T137, T303   |
| T305 | Use‑case: Toggle prefs  | Store UI prefs (critical‑only/overlays) and notify VM.            | Settings service.     | Preferences persist between runs.             | T211         |

## 6) Calendar Integration (queue & binding) (T340–T347)

| ID   | Task                       | Description                                                   | Deliverables                                          | Acceptance Criteria                                   | Dependencies |
| ---- | -------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ------------ |
| T340 | Calendar gateway interface | `ICalendarGateway` with `UpsertEventAsync`, `DeleteAsync`.    | Interface & DTOs (summary, times, description, link). | Compiles; mockable.                                   | T101         |
| T341 | Binding repository         | CRUD for `(provider, calendarId, eventId)` per Note.          | `CalendarBindingRepository`.                          | Round‑trip tests.                                     | T106         |
| T342 | Upsert queue               | Durable queue/outbox; enqueue on schedule commit.             | `CalendarQueue` + worker.                             | Items persist across restarts; processed when online. | T146         |
| T343 | Google adapter (mock)      | Implement gateway with in‑memory mock first.                  | Mock adapter + tests.                                 | Upsert/Delete called with correct payloads.           | T340         |
| T344 | Google adapter (real)      | Project scaffolding for real API (no secrets committed).      | Placeholder class; OAuth plan doc.                    | Compiles; behind feature flag.                        | T343         |
| T345 | Idempotent upsert logic    | If binding exists → update; else create & write binding.      | `CalendarPublisher` service.                          | Double upsert results in one event.                   | T341, T343   |
| T346 | Delete on unschedule       | When note removed/unscheduled, delete event & binding.        | Handler extension.                                    | Binding row gone; event deleted (mock).               | T345         |
| T347 | Error handling + retries   | Exponential backoff; dead‑letter after N attempts; UI notice. | Retry policy & DLQ.                                   | Forced failures end up in DLQ after N attempts.       | T342, T345   |

## 7) Custom GPTs & Patch Server (optional) (T380–T399)

| ID   | Task                        | Description                                                                                    | Deliverables                          | Acceptance Criteria                                   | Dependencies |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- | ------------ |
| T380 | Patch Server hardening      | Require Bearer token; process isolation; surfacing exit codes.                                 | Config & handler improvements.        | Missing/invalid token → 401/403; valid patch applies. | repo         |
| T381 | OpenAPI auth & URL          | Set ngrok URL in `openapi.yaml`; keep token out of repo.                                       | Local OpenAPI for GPT Builder import. | Action calls `/health` OK.                            | T380         |
| T382 | Actions‑enabled GPT variant | Duplicate Architect/UI GPTs with Actions; document `/branch`→`/apply`→`/commit`→`/push`→`/pr`. | Two GPT configs saved.                | Trivial patch PR created via chat.                    | T381         |

---

# **Part 3 of 3 — Tasks T500–T999 + FR→Task Mapping**

## 8) Testing & QA (T500–T510)

| ID   | Task                        | Description                                                                | Deliverables                 | Acceptance Criteria                            | Dependencies |
| ---- | --------------------------- | -------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------- | ------------ |
| T500 | Cycle detection tests       | Positive/negative, **explicit path** assertion.                            | `DagValidatorTests.cs`.      | All pass.                                      | T130         |
| T501 | CPM correctness tests       | ES/EF/LS/LF for known DAGs; project length.                                | `CpmTests.cs`.               | Matches expected math.                         | T132–T133    |
| T502 | Capacity & ties tests       | Spanning notes across measures; no overfill.                               | `CapacityTieTests.cs`.       | Pass.                                          | T142         |
| T503 | Locks/windows tests         | Fixed measure & timespan locks; earliest/due windows.                      | `LockWindowTests.cs`.        | Conflicts diagnosed; valid placements honored. | T137–T138    |
| T504 | Diagnostics tests           | Critical path deficit; lock/window conflicts.                              | `DiagnosticsTests.cs`.       | Strings list specific notes/locks.             | T144         |
| T505 | Priority determinism        | Property test for deterministic ordering.                                  | `PriorityPropertyTests.cs`.  | Passes 100 cases.                              | T141         |
| T506 | Golden schedule fixtures    | 5 goldens; JSON in/out stable; diff on change.                             | `ScheduleGoldenTests.cs`.    | Green on CI.                                   | T147         |
| T507 | UI VM: selection & overlays | Verify VisibleNotes under critical‑only; edges count bundled vs unbundled. | `ScoreViewModelTests.cs`.    | Green.                                         | T209, T207   |
| T508 | UI VM: drag & resize        | `LockNote` invoked; beats change updates width.                            | `ScoreInteractionsTests.cs`. | Green.                                         | T212–T213    |
| T509 | Calendar idempotency        | Two upserts → one event; delete removes event & binding.                   | `CalendarPublisherTests.cs`. | Green.                                         | T345–T346    |
| T510 | Performance smoke test      | 500 notes under 3s; assert on CI.                                          | `SchedulePerfTests.cs`.      | Green across OS matrix.                        | T149         |

## 9) CI, Packaging, Release (T580–T587)

| ID   | Task                           | Description                                                                                    | Deliverables                   | Acceptance Criteria             | Dependencies |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------- | ------------ |
| T580 | GitHub Actions matrix          | `actions/setup-dotnet` with `include-prerelease: true` for 10.0.x; build/test Win/macOS/Linux. | `.github/workflows/ci.yml`.    | CI passes on all OS.            | T006         |
| T581 | NuGet caching                  | Cache step for faster CI.                                                                      | Updated workflow.              | Subsequent runs faster.         | T580         |
| T582 | Artifact upload for goldens    | Upload test outputs for inspection (on failure).                                               | Workflow step.                 | Artifacts present on failure.   | T580         |
| T583 | Desktop packaging (initial)    | Produce self‑contained builds for Win/macOS/Linux (framework‑dependent OK).                    | Build scripts; zipped outputs. | Opens on each OS; runs.         | T205, T303   |
| T584 | Windows installer (opt.)       | MSIX/Wix toolset; sign if cert available.                                                      | Installer artifact.            | Installs/uninstalls cleanly.    | T583         |
| T585 | macOS app bundle (opt.)        | `.app` bundle; notarization if desired.                                                        | Bundled app.                   | Launches on a clean mac.        | T583         |
| T586 | Linux packaging (opt.)         | AppImage or Deb build.                                                                         | Package artifact.              | Launches on Ubuntu.             | T583         |
| T587 | Release versioning & changelog | Semantic versioning; `CHANGELOG.md`.                                                           | v0.1.0 tag & notes.            | Tag created; changelog updated. | T583         |

## 10) Documentation (T640–T645)

| ID   | Task                       | Description                                                   | Deliverables               | Acceptance Criteria                     | Dependencies |
| ---- | -------------------------- | ------------------------------------------------------------- | -------------------------- | --------------------------------------- | ------------ |
| T640 | Update README (full)       | Prereqs, run/build/test, packaging, keyboard map, toggles.    | Expanded README.           | New developer builds/runs in <15 min.   | T205, T580   |
| T641 | Developer Guide            | Directory structure, Clean Architecture, how to add features. | `docs/developer-guide.md`. | Reviewed by a fresh dev.                | T640         |
| T642 | Scheduling Deep Dive       | CPM + SSGS write‑up with examples.                            | `docs/scheduling.md`.      | Mirrors code; equations correct.        | T145         |
| T643 | Accessibility Guide        | A11y features & how to test.                                  | `docs/accessibility.md`.   | Matches implemented shortcuts & labels. | T210–T211    |
| T644 | Calendar Integration Guide | OAuth, queues, bindings, troubleshooting.                     | `docs/calendar.md`.        | Dev configures adapter quickly.         | T345–T347    |
| T645 | Troubleshooting FAQ        | Common errors (SDK, SQLite locks, calendar).                  | `docs/faq.md`.             | Reduces repeated issues.                | T640         |

## 11) Security & Privacy (T660–T663)

| ID   | Task                      | Description                                                  | Deliverables                     | Acceptance Criteria                            | Dependencies |
| ---- | ------------------------- | ------------------------------------------------------------ | -------------------------------- | ---------------------------------------------- | ------------ |
| T660 | Token storage             | OAuth tokens in OS keychain; never plain files.              | Token store adapter.             | Tokens survive restarts; not in repo.          | T344         |
| T661 | Encryption at rest (opt.) | Optional password‑protected project encryption.              | Small wrapper; off by default.   | Project opens only with passphrase if enabled. | T106         |
| T662 | Threat model note         | STRIDE‑style doc for local threats; Actions server exposure. | `docs/threat-model.md`.          | Review complete.                               | T380         |
| T663 | Actions server hardening  | Rate limiting, token rotation, allow‑lists.                  | `docs/patch-server-security.md`. | Checklist followed before exposing.            | T380         |

## 12) Observability & Diagnostics (T680–T682)

| ID   | Task                | Description                                             | Deliverables              | Acceptance Criteria                      | Dependencies |
| ---- | ------------------- | ------------------------------------------------------- | ------------------------- | ---------------------------------------- | ------------ |
| T680 | Structured logging  | Serilog to rolling files; enrichers.                    | Logging config & wrapper. | Logs for schedule runs & calendar flush. | T303, T345   |
| T681 | Diagnostics overlay | UI panel shows infeasibility messages & critical chain. | View + VM binding.        | Clear messages on failures.              | T144, T205   |
| T682 | Crash handling      | App‑level exception handler; opt‑in crash bundle.       | Handler; redaction.       | Crashes produce zip log, user‑approved.  | T680         |

## 13) Performance & Accessibility Verification (T690–T692)

| ID   | Task                        | Description                                     | Deliverables              | Acceptance Criteria                 | Dependencies |
| ---- | --------------------------- | ----------------------------------------------- | ------------------------- | ----------------------------------- | ------------ |
| T690 | Overlay recompute profiling | Profile costs; cache/batch updates.             | Profiling report & fixes. | Smoothness target ≥45 FPS.          | T215         |
| T691 | A11y audit                  | Keyboard‑only, screen reader pass, contrast AA. | Audit checklist.          | All items pass or have mitigations. | T210–T211    |
| T692 | Color‑blind palette pass    | Adjust tints; avoid color‑only encodings.       | Theme update.             | Distinguishable shapes/labels.      | T202–T205    |

## 14) Release & Post‑Release (T710–T712)

| ID   | Task                    | Description                                        | Deliverables         | Acceptance Criteria              | Dependencies |
| ---- | ----------------------- | -------------------------------------------------- | -------------------- | -------------------------------- | ------------ |
| T710 | Pre‑release QA          | End‑to‑end test with medium project (50–80 notes). | QA checklist signed. | No P0/P1 issues remain.          | T500–T509    |
| T711 | v0.1.0 tag + artifacts  | Tag, upload builds, changelog.                     | GitHub Release.      | Download & run verified on 3 OS. | T587         |
| T712 | Feedback & backlog v0.2 | Collect feedback; create prioritized backlog.      | Backlog board.       | Prioritized list exists.         | T711         |

---

## **FR → Task Mapping Checklist**

| Functional Requirement        | Tasks                                          |
| ----------------------------- | ---------------------------------------------- |
| **FR1 Create Piece**          | T300, T053, T101, T106                         |
| **FR2 Manage Measures**       | T300 (generator), T201 (UI), T106 (persist)    |
| **FR3 Chords**                | T055, T203, T106                               |
| **FR4 Notes & Dependencies**  | T055–T056, T301–T302, T130–T131                |
| **FR5 Scheduler (ASAP/ALAP)** | T132–T145, T142–T143, T144                     |
| **FR6 Manual Adjust & Locks** | T212–T213, T304, T137                          |
| **FR7 Slack & Buffers**       | T133 (slack), T139 (buffers), T205 (display)   |
| **FR8 Calendar Integration**  | T340–T347, T345–T346                           |
| **FR9 Unified Score View**    | T200–T215, T206–T211, T209                     |
| **FR10 Snapshots & Rollback** | T146–T147                                      |
| **FR11 Import/Export**        | T108 (JSON), T109 (ICS), CSV add in T108 scope |
| **FR12 Accessibility**        | T210–T211, T691                                |

---

### Import into your tracker

* Copy each table into your tracker (GitHub Issues, Linear, Jira).
* Use **IDs** as issue keys, set **Dependencies** as blockers, and label by area (Domain/Data/Scheduler/UI/Infra/QA/CI/Docs/Sec/Perf).
* If you want, I can export this as **CSV** or **GitHub issue importer JSON** so you can bulk‑create issues with dependencies pre‑linked.
