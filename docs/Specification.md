# Cadence — Comprehensive Specification (v0.1)

**Document date:** August 20, 2025
**Status:** Draft for implementation
**Audience:** Engineering, Product, Design, QA
**Primary author:** You

---

## Table of Contents

1. Vision & Scope
2. Product Goals & Non‑Goals
3. Musical Metaphor & Terminology
4. Personas & Key Scenarios
5. Functional Requirements (with Acceptance Criteria)
6. Non‑Functional Requirements
7. System Architecture
8. Domain Model (Entities, Constraints)
9. Data Design (SQLite)
10. Scheduling Model & Algorithms (CPM + SSGS)
11. Unified **Score** View (UX Spec)
12. Accessibility (A11y)
13. Offline‑First & Sync Model
14. Calendar Integration (Google first)
15. Import/Export & Interop
16. Security, Privacy & Threat Model
17. Observability & Diagnostics
18. Developer Experience (DX): Tooling, CI, Actions
19. Testing Strategy & Coverage
20. Release Plan & Milestones
21. Risk Register & Mitigations
22. Future Extensions (v2+)
23. Glossary
24. Appendices (Schemas, Examples, OpenAPI, CPM math)

---

## 1) Vision & Scope

Compose projects like music. A **Piece** (goal) with a deadline decomposes into **Chords** (deliverable slices) containing **Notes** (atomic tasks). Time is segmented into **Measures** (daily recommended), each with capacity measured in **Beats** (effort units). **Tempo** maps beats ↔ minutes. Long tasks **tie** across measures; slack appears as **rests**. The interface is a **single Score view** that overlays structure (Note→Chord→Piece) on a time/measure staff.

**In scope (v1):**

* Single user; single execution resource (no overlapping active notes).
* Offline‑first with SQLite; background calendar upserts when online.
* Scheduling engine: CPM + capacity‑aware SSGS (ASAP/ALAP), ties, locks, buffers, slack, infeasibility diagnostics.
* Unified Score view with selection‑driven highlighting, edge bundling, critical‑only mode, accessibility.

**Out of scope (v1):**

* Multi‑user collaboration (future “Instruments”).
* Browser/web distribution (Avalonia WASM optional later).
* External edits two‑way‑sync with calendars (v1 is “write‑mostly”, import‑as‑lock optional).

---

## 2) Product Goals & Non‑Goals

**Goals**

* Fast, deterministic **single‑resource** scheduler that respects dependencies and capacity to meet the deadline.
* Intuitive **Score view** that reduces cognitive load with structural clarity: highlight forward paths and simplify dense connections via **bundling**.
* Operable **fully offline**; predictable calendar publishing once online.
* Explicit, inspectable **diagnostics** for infeasible plans.

**Non‑Goals**

* Full enterprise project portfolio management; server‑hosted multi‑tenant features.
* Real‑time multi‑user editing.

---

## 3) Musical Metaphor & Terminology

| Music term    | App concept                    | Notes                                              |
| ------------- | ------------------------------ | -------------------------------------------------- |
| Piece         | Project/Goal                   | Has start & deadline.                              |
| Measure       | Timebox (day/week)             | Capacity in beats; availability (workday/holiday). |
| Beat          | Effort unit                    | Tempo converts beats ↔ minutes.                    |
| Tempo         | Minutes per beat               | Can be per‑piece with per‑measure overrides later. |
| Chord         | Task group / deliverable slice | Aggregates notes.                                  |
| Note          | Atomic task                    | Has beats‑duration; dependencies; status; locks.   |
| Tie           | Spanning task                  | Note continues across measures.                    |
| Rest          | Buffer/slack                   | Explicit reserve to absorb variability.            |
| Critical Path | Zero slack chain               | Bottleneck determining earliest finish.            |

---

## 4) Personas & Key Scenarios

**Persona:** Solo professional/engineer/creator managing complex goals across days/weeks, prefers keyboard‑friendly and offline‑capable tooling.

**Top scenarios**

1. Create a new **Piece**, define capacity (beats/measure) & tempo, scaffold daily **Measures** to the deadline.
2. Add **Chords** and **Notes** with **dependencies**; run the scheduler (ASAP or ALAP).
3. Adjust by **dragging/locking** specific Notes to measures or fixed spans; re‑run schedule honoring locks.
4. Use **Score view**: select a Note, see **forward path** Note→Chord→Piece; toggle **Critical‑only** to focus on bottlenecks; enable **edge bundling** to reduce clutter.
5. **Publish** the schedule to Google Calendar (offline queue → upsert when online).
6. Export/Import project JSON; roll back to a prior snapshot.

---

## 5) Functional Requirements (FR) with Acceptance Criteria

**FR1 — Create Piece**

* Input: title, description, startUtc, deadlineUtc, beatsPerMeasure (capacity), minutesPerBeat (tempo).
* AC: Generates contiguous Measures (daily default, 09:00–17:00 example bounds) with capacity set; saved to SQLite.

**FR2 — Manage Measures**

* Set per‑measure: capacityBeats, availability (work/holiday), label.
* AC: Adjusting capacity reflows scheduling preview; no data loss.

**FR3 — Chords**

* Create/edit/delete chords; properties: name, priority, color, softDue window.
* AC: Deleting a chord re‑parents Notes to Piece (no data loss); roll‑up progress computed from child Notes.

**FR4 — Notes & Dependencies**

* Properties: title, description, durationBeats, earliestStart, dueBy window, mandatory, context, status (Planned/InProgress/Blocked/Done), locks (measure index or span), chordId?, tags.
* AC: Dependency graph must be a DAG; cycles rejected with explicit path “A→B→C→A”.

**FR5 — Scheduler (ASAP/ALAP)**

* Compute a capacity‑aware schedule with ties across measures; respect locks/windows/buffers.
* AC: Produces a `ScheduleSnapshot` with deterministic start/end for each note or a precise infeasibility reason.

**FR6 — Manual Adjust & Locks**

* Drag note between measures; resize to change beats; lock/unlock to slot/span; re‑schedule respects locks.
* AC: Locked items never move unless explicitly unlocked.

**FR7 — Slack & Buffers**

* Compute slack; allow explicit buffers per measure.
* AC: Slack visible per Note & per Measure; buffers reduce capacity.

**FR8 — Calendar Publishing**

* Upsert Google Calendar events (summary: `[Chord] NoteTitle`) via offline queue; maintains note↔event binding.
* AC: Changes in schedule update/delete calendar events on next online flush; idempotent upserts.

**FR9 — Unified Score View**

* Time staff (measures & capacity) + structural overlay (Chord ribbon, Note→Chord edges).
* Selection‑driven forward path highlighting; **edge bundling**; **critical‑only** filter; dependency overlay toggle; **align‑by‑schedule** toggle (structural nudge, not a Gantt).
* AC: Selecting a note highlights Note→Chord→Piece path; toggles affect visibility/geometry without performance regressions.

**FR10 — Snapshots & Rollback**

* Persist schedule snapshots; restore any previous snapshot.
* AC: Restored snapshot reproduces the same dates/durations.

**FR11 — Import/Export**

* JSON full export/import (stable IDs), ICS export for milestones/due windows, CSV for Notes.
* AC: Import reconstructs identical structure; schedule reproduces given same inputs.

**FR12 — Accessibility**

* Keyboard‑complete; AutomationProperties labels on interactive elements; high‑contrast themes.
* AC: All commands reachable without mouse; screen reader announces Note title, beats, chord, and “critical”.

---

## 6) Non‑Functional Requirements (NFR)

* **Performance:** CRUD < 50 ms; schedule ≤ 500 notes in < 3 s on a typical laptop.
* **Determinism:** Same inputs → same schedule.
* **Portability:** .NET 10 (`net10.0`), Avalonia desktop; Linux/macOS/Windows.
* **Reliability:** No data loss on power loss; WAL mode enabled in SQLite; safe commits.
* **Security:** Tokens in OS keychain; project file encryption optional at rest.
* **Testability:** ≥ 80% coverage on scheduling domain; golden fixtures for snapshots.

---

## 7) System Architecture

**Pattern:** Clean Architecture + MVVM

* **Domain** (`Cadence.Domain`): Entities, value objects (`Beats`, `Minutes`), services (`IScheduler`), CPM/SSGS logic, diagnostics.
* **Application** (`Cadence.Application`): Use cases (`CreatePiece`, `AddNote`, `RunSchedule`, `PublishCalendar`, `RollbackSnapshot`, …), DTOs.
* **Infrastructure** (`Cadence.Infrastructure`): SQLite repositories (EF Core recommended; Dapper possible), calendar gateway, OAuth token store, import/export.
* **UI** (`Cadence.App`): Avalonia MVVM (CommunityToolkit), unified **Score** view.

**Dependency Rule:** UI → Application → Domain. Infrastructure implements interfaces; injected.

**Inter‑module contracts**

* `IScheduler.RunAsync(Piece, ScheduleMode)` → `ScheduleSnapshot`
* `ICalendarPublisher.UpsertAsync(Note, ScheduledNote)` & `DeleteAsync(noteId)`
* Repositories: `IPieceRepository`, `INoteRepository`, `IDependencyRepository`, `ISnapshotRepository`, `ICalendarBindingRepository`

---

## 8) Domain Model

**Entities**

* `Piece`: Id, Title, StartUtc, DeadlineUtc, BeatsPerMeasure, MinutesPerBeat, Measures\[], Chords\[], Notes\[], Dependencies\[]
* `Measure`: Id, Index, StartUtc, EndUtc, CapacityBeats, Availability, Label
* `Chord`: Id, Name, Priority, Color, SoftDueStartUtc?, SoftDueEndUtc?
* `Note`: Id, Title, Description?, DurationBeats, EarliestStartUtc?, DueByUtc?, Mandatory, Context?, Status, ChordId?, LockedMeasureIndex?, LockedSpanUtc?
* `Dependency`: Id, PredecessorNoteId, SuccessorNoteId
* `Buffer`: per‑measure beats reserved (optional table or property on Measure)
* `ScheduleSnapshot`: Id, PieceId, CreatedUtc, Mode, `ScheduledNote[]`
* `ScheduledNote`: NoteId, StartUtc, EndUtc
* `CalendarBinding`: NoteId ↔ (Provider, CalendarId, EventId)

**Constraints**

* Dependency graph is a **DAG**.
* Sum of scheduled beats per measure ≤ capacity minus buffers.
* Single resource → no overlap of active Notes.

**Future‑proof fields (v2+)**

* `Instrument` lane for multi‑user; `Motif` for task patterns/templates.

---

## 9) Data Design (SQLite)

**Schema (DDL excerpt)**

```sql
CREATE TABLE Piece (
  Id TEXT PRIMARY KEY,
  Title TEXT NOT NULL,
  Description TEXT,
  StartUtc TEXT NOT NULL,
  DeadlineUtc TEXT NOT NULL,
  BeatsPerMeasure INTEGER NOT NULL,
  MinutesPerBeat REAL NOT NULL,
  CreatedUtc TEXT NOT NULL,
  UpdatedUtc TEXT NOT NULL
);

CREATE TABLE Measure (
  Id TEXT PRIMARY KEY,
  PieceId TEXT NOT NULL,
  IndexInPiece INTEGER NOT NULL,
  StartUtc TEXT NOT NULL,
  EndUtc TEXT NOT NULL,
  CapacityBeats INTEGER NOT NULL,
  Availability TEXT NOT NULL, -- Workday/Holiday
  Label TEXT,
  FOREIGN KEY(PieceId) REFERENCES Piece(Id) ON DELETE CASCADE
);

CREATE TABLE Chord (
  Id TEXT PRIMARY KEY,
  PieceId TEXT NOT NULL,
  Name TEXT NOT NULL,
  Priority INTEGER NOT NULL,
  Color TEXT,
  SoftDueStartUtc TEXT,
  SoftDueEndUtc TEXT,
  FOREIGN KEY(PieceId) REFERENCES Piece(Id) ON DELETE CASCADE
);

CREATE TABLE Note (
  Id TEXT PRIMARY KEY,
  PieceId TEXT NOT NULL,
  ChordId TEXT,
  Title TEXT NOT NULL,
  Description TEXT,
  DurationBeats REAL NOT NULL,
  EarliestStartUtc TEXT,
  DueByUtc TEXT,
  Mandatory INTEGER NOT NULL DEFAULT 1,
  Context TEXT,
  Status TEXT NOT NULL,
  LockedMeasureIndex INTEGER,
  LockedStartUtc TEXT, LockedEndUtc TEXT,
  FOREIGN KEY(PieceId) REFERENCES Piece(Id) ON DELETE CASCADE,
  FOREIGN KEY(ChordId) REFERENCES Chord(Id) ON DELETE SET NULL
);

CREATE TABLE Dependency (
  Id TEXT PRIMARY KEY,
  PieceId TEXT NOT NULL,
  PredecessorNoteId TEXT NOT NULL,
  SuccessorNoteId TEXT NOT NULL,
  FOREIGN KEY(PieceId) REFERENCES Piece(Id) ON DELETE CASCADE,
  FOREIGN KEY(PredecessorNoteId) REFERENCES Note(Id) ON DELETE CASCADE,
  FOREIGN KEY(SuccessorNoteId) REFERENCES Note(Id) ON DELETE CASCADE,
  CONSTRAINT NoSelfDep CHECK (PredecessorNoteId <> SuccessorNoteId)
);

CREATE TABLE ScheduleSnapshot (
  Id TEXT PRIMARY KEY,
  PieceId TEXT NOT NULL,
  CreatedUtc TEXT NOT NULL,
  Mode TEXT NOT NULL, -- Forward/Backward
  FOREIGN KEY(PieceId) REFERENCES Piece(Id) ON DELETE CASCADE
);

CREATE TABLE ScheduledNote (
  SnapshotId TEXT NOT NULL,
  NoteId TEXT NOT NULL,
  StartUtc TEXT NOT NULL,
  EndUtc TEXT NOT NULL,
  PRIMARY KEY (SnapshotId, NoteId),
  FOREIGN KEY(SnapshotId) REFERENCES ScheduleSnapshot(Id) ON DELETE CASCADE,
  FOREIGN KEY(NoteId) REFERENCES Note(Id) ON DELETE CASCADE
);

CREATE TABLE CalendarBinding (
  Id TEXT PRIMARY KEY,
  NoteId TEXT NOT NULL,
  Provider TEXT NOT NULL,
  CalendarId TEXT NOT NULL,
  EventId TEXT NOT NULL,
  FOREIGN KEY(NoteId) REFERENCES Note(Id) ON DELETE CASCADE
);

CREATE INDEX IX_Dep_Succ ON Dependency (SuccessorNoteId);
CREATE INDEX IX_Dep_Pred ON Dependency (PredecessorNoteId);
CREATE INDEX IX_SchedNote_Snapshot ON ScheduledNote (SnapshotId);
CREATE INDEX IX_Note_Piece ON Note (PieceId);
CREATE INDEX IX_Note_Chord ON Note (ChordId);
```

**Storage details**

* **WAL mode** for durability & read concurrency.
* **Time zone**: store UTC; interpret working hours in user’s locale to compute measure Start/End UTC.
* **IDs**: use GUID/ULID strings; keep stable across exports/imports.

---

## 10) Scheduling Model & Algorithms

**Units & mapping**

* **Beats** = effort units; `minutes = beats × minutesPerBeat`.
* **Time signature**: `beatsPerMeasure` = capacity per measure.
* **Measures**: daily (recommended) or weekly.
* **Ties**: if a Note exceeds remaining capacity in a measure, it spans into next measure(s).

**Inputs**

* `Piece` with `Measures`, `Notes`, `Dependencies`, `Locks`, `Buffers`, `Tempo`.
* **Mode**: `Forward` (ASAP) or `Backward` (ALAP).

**Algorithm**

1. **Validate DAG** (Kahn or DFS). On cycle, return explicit cycle path for diagnostics.
2. **CPM (ignore capacity):**

   * Forward pass: `ES[i] = max(EF[preds(i)])`, `EF[i] = ES[i] + d[i]`.
   * Backward pass (anchored to project length in beats): `LF[i] = min(LS[succs(i)])`, `LS[i] = LF[i] − d[i]`.
   * Slack: `SL[i] = LS[i] − ES[i]`; `SL=0` ⇒ critical.
3. **Feasibility sanity check**: if **critical path beats** > **total available beats** across measures (minus buffers), return infeasible with the critical chain and the deficit.
4. **Serial Schedule Generation Scheme (SSGS)** (capacity‑aware):

   * Maintain a **ready set** (all predecessors scheduled).
   * **Priority rule** (configurable, default): min slack → earliest due → longest processing time.
   * **Placement:**

     * **ASAP**: earliest start respecting *locks* (fixed measure/span), *windows* (earliestStart/dueBy), capacity and no overlap.
     * **ALAP**: latest finish while still meeting deadline.
   * **Ties** across measures as needed; `ScheduledNote` stays continuous in time; UI renders ties.
5. **Output** `ScheduleSnapshot` (NoteId→Start/End) + **diagnostics** if infeasible:

   * Critical path exceeds capacity by *X beats*
   * Lock conflict (list locks)
   * Window conflict (list notes and windows)

**Determinism**

* Stable priority resolution; explicit secondary keys (e.g., title, GUID) to break ties.

---

## 11) Unified **Score** View (UX Spec)

**Purpose**
One view merges **time** (measures/capacity) and **structure** (Notes→Chords→Piece), avoiding Gantt complexity.

**Layout**

* **Top ribbon:** **Chords** as labeled badges.
* **Staff:** Horizontal **Measures** (daily). Headings show date + `capacity/used beats`.
* **Notes:** Rounded **pills** placed by scheduled start/end; width proportional to duration; color tinted by chord.
* **Ties:** When spanning measures, draw tie glyphs across boundaries.
* **Overlays (toggles):**

  1. **Dependencies** (Note→Note): subtle thin curves behind structure edges.
  2. **Align by schedule**: gentle horizontal nudge to reflect start position while **preserving structural semantics** (this is not a Gantt).
  3. **Edge bundling**: a **vertical spine** per chord with small “elbows” from notes (“fishbone”) to the spine, and a chord→piece line.
  4. **Critical‑only**: show only Notes on CPM critical path (ignore capacity for the filter); hide non‑critical.

**Selection‑driven highlighting**

* **Click** a Note: highlight **Note→Chord→Piece** path at full opacity; dim unrelated notes/edges.
* Hover shows a preview; selection pins it.
* Side panel shows: beats, ES/EF/LS/LF, slack, chord, due window, locks.

**Keyboard & interactions**

* `Tab/Shift+Tab` cycle between Notes; arrow keys move within measure/date order.
* `Enter/Space` selects; `Esc` clears selection.
* `D` toggle dependency overlay; `B` bundling; `K` critical‑only; `A` align‑by‑schedule.
* Drag Note horizontally to **lock to a measure**; resize edges to change beats (with confirmation).

**Accessibility**

* Each Note pill exposes `AutomationProperties.Name`:
  `"Note 'Draft melody', 3 beats, chord 'Design Theme', critical path."`
* Focus ring visible; high‑contrast palette available.
* All toggles and commands accessible via keyboard.

**Performance**

* **Virtualized drawing** for notes; overlay edges precomputed to `Path` geometry (VM‑supplied).
* Bundling spine computed from median note centers per chord; recompute incrementally on change.

---

## 12) Accessibility (A11y)

* **Screen readers:** Proper `AutomationProperties.Name` & `HelpText` on interactive elements.
* **Keyboard:** Full parity for all operations; discoverable shortcuts.
* **Contrast:** Meets WCAG AA; provide light/dark & high‑contrast themes.
* **Motion sensitivity:** Disable animated transitions via setting.

---

## 13) Offline‑First & Sync Model

* **Local first:** SQLite is the **source of truth**.
* **Calendar upsert queue:** On schedule commit, enqueue `UpsertEvent(NoteId)`; a background worker flushes when online.
* **Idempotency:** Upsert reads `CalendarBinding`; create if missing, update if present; delete on unschedule.
* **Conflict policy (v1):** External calendar is **write‑mostly** sink. Optionally, allow importing external moves as **locks** with explicit user confirmation.

---

## 14) Calendar Integration (Google first)

**Mapping**

* Note → Event:

  * `summary = "[<Chord>] <NoteTitle>"`
  * `start/end = ScheduledNote (UTC)`
  * `description` includes context and deep link: `cadence://note/{id}`
* `CalendarBinding`: store `(Provider, CalendarId, EventId)`.

**OAuth & tokens**

* Store tokens in **OS keychain**; refresh as needed.

**Failure handling**

* Retry queue with exponential backoff; mark items dead‑letter after N failures; show diagnostics.

---

## 15) Import/Export & Interop

* **Project JSON**: full export/import with stable IDs (Piece, Measure, Chord, Note, Dep).
* **ICS**: export milestones/due windows as VEVENTs.
* **CSV**: notes (flat) for external review.

---

## 16) Security, Privacy & Threat Model

* **Data at rest:** SQLite DB local; optional encryption (passphrase).
* **Credentials:** OAuth tokens in OS keychain; never stored in plain files.
* **Actions server (if used):** Local‑only, **Bearer** token protected; expose via ngrok only during sessions.
* **Threats mitigated:** accidental patch application, token leakage, calendar API abuse → minimize scopes, store tokens securely, confirm destructive operations.

---

## 17) Observability & Diagnostics

* **Structured logs** (Serilog) to file with rotation.
* **Diagnostics:**

  * Scheduler reasons: critical path chain; lock/window conflicts; capacity deficits.
  * UI overlay to show diagnostics inline.
* **Crash reports:** Optional, off by default.

---

## 18) Developer Experience (DX)

**Tech stack**

* .NET 10 (`net10.0`, preview features enabled), Avalonia 11+, CommunityToolkit.Mvvm, EF Core (or Dapper).
* Project layout:

  ```
  Cadence/
    src/
      Cadence.Domain/
      Cadence.Application/
      Cadence.Infrastructure/
      Cadence.App/
    tests/
      Cadence.Tests/
    tools/
      GptActions/ (OpenAPI + Patch Server)
  ```

**CI**

* GitHub Actions matrix: win/macos/linux; `setup-dotnet` with include‑prerelease; restore/build/test; upload golden fixtures.

**Using Custom GPTs effectively**

* **SEE** code: enable **GitHub Connector**; or use **Projects** and upload the repo snapshot.
* **EDIT** code (optional): add **Patch Server Action** so a GPT can `/apply` diffs → `/commit` → `/push` → `/pr`.
* Keep two variants of GPTs: **No‑Actions** (for GPT‑5 reasoning) and **Actions‑enabled** (for commits).

---

## 19) Testing Strategy & Coverage

**Domain (Scheduler)**

* **Unit tests:** cycle detection (explicit path), ties across measures, locks/windows, buffers capacity, CPM slack correctness.
* **Property tests:** random DAGs (≤ 40 notes), random capacities/windows; assert: no overlaps, capacity respected, dependencies respected, determinism.
* **Golden tests:** input JSON → expected `ScheduleSnapshot` JSON; diff on change.

**UI ViewModels**

* Score view: drag‑to‑lock updates locks; resize changes beats; toggles affect edges/visibility; selection highlights path; accessibility labels present.

**Infrastructure**

* Repositories round‑trip; WAL enabled; calendar upsert idempotency (mock API).

**CI gating**

* Coverage threshold; static analysis; formatting.

---

## 20) Release Plan & Milestones

* **M0:** Solution skeleton; SQLite wiring; seed loader; Score view scaffold.
* **M1:** CRUD + Outline panel; DAG validation; initial tests.
* **M2:** **Scheduler v1** (CPM + SSGS) with ties/locks/buffers; snapshots; diagnostics; tests.
* **M3:** **Score view enhancements**: selection‑driven highlighting, **edge bundling**, **critical‑only**, dependency overlay; accessibility pass.
* **M4:** Calendar upsert queue + bindings; ICS export.
* **M5:** Polish; packaging for Linux/macOS/Windows; CI; docs.

---

## 21) Risk Register & Mitigations

| Risk                           | Impact | Mitigation                                                                                      |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------- |
| Infeasible deadlines           | High   | Early CPM check with explicit chain + suggestions (add capacity, increase tempo, reduce beats). |
| Visual clutter with many notes | Medium | **Edge bundling**, filters, dependency overlay off by default, collapse small notes.            |
| Calendar divergence            | Medium | v1 write‑mostly; offer import‑as‑lock confirmation.                                             |
| Time zone confusion            | Medium | Store UTC; surface user locale; show explicit offsets in diagnostics.                           |
| Estimation inaccuracy          | Medium | Track actuals; retime (tempo change); reschedule with buffers.                                  |

---

## 22) Future Extensions (v2+)

* **Multi‑user**: Instruments (lanes/resources), parallel capacity, resource‑level calendars.
* **Templates (Motifs)**: recurring DAG fragments; libraries.
* **Web & mobile**: Avalonia WASM or Uno/MAUI front‑ends using the same Domain.
* **Cost/effort forecasting**: burn‑down charts; Monte‑Carlo slack risk.
* **Two‑way calendar sync**: editable events import as locks automatically.

---

## 23) Glossary

* **Piece**: Project goal with start and deadline.
* **Measure**: Timebox (day/week) with capacity in beats.
* **Beat**: Effort unit; tempo maps beats ↔ minutes.
* **Tempo**: Minutes per beat.
* **Note**: Atomic task with beats duration and dependencies.
* **Chord**: Group of Notes (deliverable slice).
* **Tie**: A Note spanning multiple measures.
* **Rest**: Buffer/slack.
* **Slack (CPM)**: `LS − ES`; zero = critical.
* **Critical path**: Longest path (in beats) through the DAG (ignoring capacity).
* **ASAP/ALAP**: Schedule as soon/late as possible.

---

## 24) Appendices

### A) Example Project JSON (seed)

```json
{
  "piece": {
    "id": "piece-1",
    "title": "Album v1",
    "startUtc": "2025-09-01T09:00:00Z",
    "deadlineUtc": "2025-09-15T17:00:00Z",
    "beatsPerMeasure": 8,
    "minutesPerBeat": 60
  },
  "measures": [
    {"index":0,"startUtc":"2025-09-01T09:00:00Z","endUtc":"2025-09-01T17:00:00Z","capacityBeats":8},
    {"index":1,"startUtc":"2025-09-02T09:00:00Z","endUtc":"2025-09-02T17:00:00Z","capacityBeats":8}
  ],
  "chords": [
    {"id":"ch-A","name":"Design Theme","priority":1,"color":"#639"},
    {"id":"ch-B","name":"Implementation","priority":2,"color":"#296"}
  ],
  "notes": [
    {"id":"n1","title":"Draft melody","durationBeats":3,"chordId":"ch-A"},
    {"id":"n2","title":"Harmony pass","durationBeats":5,"chordId":"ch-A"},
    {"id":"n3","title":"Mix pass","durationBeats":4,"earliestStartUtc":"2025-09-03T09:00:00Z","chordId":"ch-B"}
  ],
  "dependencies":[
    {"id":"d1","predecessorNoteId":"n1","successorNoteId":"n2"},
    {"id":"d2","predecessorNoteId":"n2","successorNoteId":"n3"}
  ],
  "buffers":[
    {"measureIndex":1,"beats":1}
  ]
}
```

### B) OpenAPI (Patch Server for Actions)

```yaml
openapi: 3.0.1
info:
  title: Cadence Patch Server
  version: "0.1"
servers:
  - url: https://YOUR-NGROK-ID.ngrok.app
paths:
  /health: { get: { responses: { "200": { description: OK }}}}
  /branch:
    post: { requestBody: { content: { application/json: { schema: { type: object, properties: { name: {type: string}}, required: [name]}}}}, responses: {"200":{description:Switched}}}
  /apply:
    post: { requestBody: { content: { text/plain: { schema: { type: string }}}}, responses: {"200":{description:Applied}}}
  /commit:
    post: { requestBody: { content: { application/json: { schema: { type: object, properties: { message: {type: string}}, required: [message]}}}}, responses: {"200":{description:Committed}}}
  /push:
    post: { requestBody: { content: { application/json: { schema: { type: object, properties: { branch: {type: string}}, required: [branch]}}}}, responses: {"200":{description:Pushed}}}
  /pr:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties: { owner:{type:string}, repo:{type:string}, title:{type:string}, head:{type:string}, base:{type:string} }
              required: [owner, repo, title, head, base]
      responses: {"200": { description: PR created }}
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer }
security: [ { bearerAuth: [] } ]
```

### C) CPM Math (brief)

* Forward pass: `ES[i] = max(EF[preds(i)])`, `EF[i] = ES[i] + d[i]`.
* Backward pass: `LF[i] = min(LS[succs(i)])`, `LS[i] = LF[i] − d[i]`.
* Slack: `SL[i] = LS[i] − ES[i]`; critical if `SL=0`.
* Project length = `max(EF[i])`.
* Placement then respects measure capacities, locks, and windows (SSGS).

### D) Accessibility Labels Examples

* **Note (critical):**
  `AutomationProperties.Name = "Note 'Harmony pass', 5 beats, chord 'Design Theme', critical path."`
* **Note (non‑critical):**
  `"Note 'Mix pass', 4 beats, chord 'Implementation'."`
* **HelpText:**
  `"Press Enter to select. Press D to toggle dependencies, B for bundling, K for critical-only."`

---

## Definition of Done (v1)

* All FRs met with passing acceptance tests.
* Scheduler deterministic; golden fixtures stable; property tests pass.
* Calendar publishing idempotent; offline queue verified.
* Accessibility checks pass (keyboard + screen reader on at least one OS).
* CI green on Linux/macOS/Windows; installers produced.
