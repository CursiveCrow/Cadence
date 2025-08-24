# Cadence — Engineering Design & Implementation Specification

_Implementation-ready blueprint for an engineering LLM to build end‑to‑end_

> **Scope anchors.** Cadence treats projects as music: **Scores** (projects) contain **Measures** (time slices), within which **Chords** group parallel **Notes** (tasks). Dependencies align “melodies” horizontally; the product is **offline‑first** with a **clean seam for sync**, and must run on **desktop + mobile** (web optional). These domain concepts and constraints are normative in this spec.&#x20;

---

## 0) Executive summary

- **Archetype & stack:** TypeScript‑first monorepo with **React (Web)**, **Electron (Desktop)**, **React Native (Mobile)** for UI; **PixiJS** (Web/Electron) and **react‑native‑skia** (Mobile) for the high‑FPS timeline canvas; **Node.js + GraphQL** services; **PostgreSQL** + **Redis**; **CRDT (Yjs)** for offline‑first collaboration; **SQLite** (WASM on Web, native on Mobile/Desktop) for local storage.
- **Core differentiator:** Timeline is a **custom GPU canvas** rendering staff lines, measures, chords, note pills, and short dependency connectors, keeping chains on the same lane whenever possible (“melody alignment”).&#x20;
- **Delivery:** Three phased milestones (MVP offline → Sync & resources → Forecast & polish), full CI/CD, tests, and packaging for Windows/macOS/Linux, iOS/Android, and Web.

---

## 1) Goals, non‑goals, and acceptance

### 1.1 Goals

- Cross‑platform app(s): desktop (Win/macOS/Linux), mobile (iOS/Android), optional web, **shared domain logic**.&#x20;
- Custom, animated timeline canvas with **measures**, **chords**, **notes**, and **dependencies** rendered at 60 fps.&#x20;
- **Offline‑first** persistence; later enable **realtime sync** with conflict tolerance.&#x20;
- Clear, testable separation: domain algorithms (quantization, DAG, lane assignment) isolated from UI.&#x20;

### 1.2 Non‑goals (MVP)

- Multi‑user concurrent editing at planet scale (we support small teams first).
- Enterprise SSO/SCIM (post‑MVP).
- Gantt‑style resource leveling beyond the “light” heuristic (Phase 2 adds a first pass).

### 1.3 System‑level acceptance (MVP)

- Render 1,000 notes / 2,000 dependencies at ≥60 fps on desktop; ≥60 fps on modern phones.
- Full timeline editing **without network**; restart recovers state.
- No dependency cycles admitted; moves that would violate constraints are blocked with guided fixes.
- Import/export of a _Score bundle_ (JSON) round‑trips losslessly.

---

## 2) Domain vocabulary (normative)

- **Score**: A project timeline with `start`, `end`, `tempo` (beats/measure).
- **Measure**: Equal‑duration segment; vertical bar lines; labels shown on the grid.
- **Beat**: Smallest quantized unit within a measure.
- **Chord**: Set of notes with the **same start beat** within a measure (implicit grouping).
- **Note**: Atomic task with `title`, `startBeat`, `durationBeats`, optional `meta`, `assignees`.
- **Dependency**: Directed edge A→B; Cadence tries to keep B **on A’s lane**; fan‑outs place dependents on adjacent lanes to minimize connector length.&#x20;

---

## 3) Architecture overview

### 3.1 High‑level diagram

```mermaid
flowchart TB
  subgraph Clients
    W[Web (React + PixiJS)]
    D[Desktop (Electron + React + PixiJS)]
    M[Mobile (React Native + RN Skia)]
  end

  subgraph ClientData[Client Offline Store]
    YDoc[Yjs CRDT (per Score)]
    SQLw[SQLite WASM (OPFS)]
    SQLn[SQLite (native)]
  end

  W -- CRUD + canvas draw --> YDoc
  D -- CRUD + canvas draw --> YDoc
  M -- CRUD + canvas draw --> YDoc
  YDoc <-.persist.-> SQLw
  YDoc <-.persist.-> SQLn

  W -- GraphQL/HTTPS --> APIGW[Fastify Gateway]
  D -- GraphQL/HTTPS --> APIGW
  M -- GraphQL/HTTPS --> APIGW

  W -- WebSocket --> RTGW[Realtime Gateway (y‑ws compatible)]
  D -- WebSocket --> RTGW
  M -- WebSocket --> RTGW

  APIGW --> API[GraphQL API (Node/TS)]
  RTGW <--> REDIS[(Redis: Pub/Sub, Queues)]

  API --> PG[(PostgreSQL)]
  API --> S3[(Object Storage)]
  API --> REDIS

  subgraph Workers[Workers (BullMQ)]
    IDX[Indexing]
    EXP[Export/Import]
    VAL[Server DAG/Rules]
  end

  REDIS --> Workers
  Workers --> PG
  Workers --> S3

  AUTH[OIDC Provider] --> APIGW
  APIGW -- traces --> OBS[OTel + Prometheus/Grafana + Sentry]
  API -- traces --> OBS
  Workers -- traces --> OBS
  RTGW -- traces --> OBS
```

### 3.2 Monorepo layout (pnpm + Turborepo)

```
cadence/
  apps/
    web/                # React + PixiJS
    desktop/            # Electron shell wrapping web
    mobile/             # React Native + RN Skia
  services/
    api/                # Fastify + GraphQL + Postgres
    realtime/           # y-websocket compatible gateway
    workers/            # BullMQ jobs (indexing, export, validators)
  packages/
    domain/             # Pure TS: models, DAG, quantization, lane assignment
    renderer/           # Draw grammar: PixiJS backend + RN-Skia backend
    storage/            # Local persistence adapters (SQLite WASM/native)
    schema/             # GraphQL SDL, Zod validators, shared types
    crdt/               # Yjs bindings & persistence providers
    ui/                 # Shared components, design tokens
  infra/
    terraform/          # AWS EKS/RDS/ElastiCache/S3/CloudFront
    github-actions/     # CI/CD workflows
```

---

## 4) Technology selections (implementation mandates)

- **UI stacks**:

  - **Web/Desktop:** React 18 + Vite, **PixiJS** for WebGL2 canvas; Electron for desktop shell.
  - **Mobile:** React Native 0.7x + **@shopify/react-native-skia** for GPU canvas.

- **State & data**: Zustand for local UI state; TanStack Query for server cache; **Yjs** CRDT as the editable document; **SQLite** persisted snapshot locally (WASM on Web via OPFS).
- **Backend**: Node 20 + Fastify; **GraphQL** (Helix/Apollo) with Subscriptions; **PostgreSQL** (RDS); **Redis** (ElastiCache) for pub/sub and queues; file storage on S3‑compatible.
- **Offline & sync**: CRDT deltas over WebSockets; server materializes to Postgres for queries/reporting.
- **Observability**: OpenTelemetry, Prometheus/Grafana, Sentry.
- **Auth**: OIDC (Auth0/Clerk/Cognito); JWT validation at gateway; row‑level auth in resolvers.

---

## 5) Functional requirements (FR) with acceptance

**FR‑1 Create/Edit Scores** — Users can create, rename, set `start`, `end`, `tempo`; editing reflows measure grid. _Acceptance:_ Editing tempo updates measure lines and beat quantization deterministically.&#x20;

**FR‑2 Add/Edit Notes** — Create notes with `title`, `startBeat`, `durationBeats`; drag horizontally to snap to nearest beat; vertically to other lanes when needed. _Acceptance:_ Dragging snaps to beat; collisions create chords (stack).&#x20;

**FR‑3 Dependencies** — Link A→B; enforce acyclicity and finish‑to‑start by default; draw short connectors when off‑lane. _Acceptance:_ Cycle attempts blocked; UI proposes auto‑shift of B.&#x20;

**FR‑4 Melody alignment** — A dependent note inherits predecessor’s lane when available; otherwise nearest free lane chosen, minimizing vertical movement. _Acceptance:_ Chains A→B→C appear on one line unless concurrency forces a split.&#x20;

**FR‑5 Multi‑Score view** — Stack multiple Scores vertically; synchronized zoom; optional aligned horizontal scroll when date axes overlap. _Acceptance:_ Toggle “Align scales” links scroll boundaries across Scores.&#x20;

**FR‑6 Offline‑first** — All CRUD works without network; restart restores state; conflict‑tolerant sync later. _Acceptance:_ Airplane‑mode edit session survives and syncs when online.&#x20;

**FR‑7 Import/Export** — Score bundle JSON export/import round‑trips positions, durations, dependencies, and preferences. _Acceptance:_ Import of an exported file yields byte‑equivalent CRDT state after canonicalization.

---

## 6) Non‑functional requirements (NFR)

- **Performance:** ≥60 fps renders; median frame ≤16 ms; cold open ≤50 ms for 500‑note Score.
- **Reliability:** Crash‑free sessions ≥99.5% (30‑day rolling).
- **Accessibility:** Keyboard‑complete editing; WCAG AA contrast; SR announcements: “Note ‘Compile’, Measure 3 Beat 2, depends on ‘Build’.”
- **Security:** JWT‑based auth; RLS in resolvers; encrypted at rest (RDS/S3).
- **Internationalization:** ISO‑8601 dates; timezone‑aware display; LTR/RTL safe layout.

---

## 7) Data model (relational, CRDT, and local)

### 7.1 Relational schema (PostgreSQL)

```sql
create table scores (
  id uuid primary key,
  owner_id uuid not null,
  name text not null,
  start_ts timestamptz not null,
  end_ts   timestamptz not null,
  tempo int not null check (tempo > 0),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notes (
  id uuid primary key,
  score_id uuid not null references scores(id) on delete cascade,
  title text not null,
  start_beat int not null check (start_beat >= 0),
  duration_beats int not null default 1 check (duration_beats > 0),
  lane_index int, -- optional materialization
  meta jsonb not null default '{}'
);

create table dependencies (
  score_id uuid not null references scores(id) on delete cascade,
  src_note_id uuid not null references notes(id) on delete cascade,
  dst_note_id uuid not null references notes(id) on delete cascade,
  constraint dependencies_pk primary key (score_id, src_note_id, dst_note_id),
  constraint no_self_dep check (src_note_id <> dst_note_id)
);

create table events ( -- append-only audit/oplog
  id bigserial primary key,
  score_id uuid not null references scores(id) on delete cascade,
  actor_id uuid,
  type text not null,
  payload jsonb not null,
  ts timestamptz not null default now()
);

-- FTS (optional early)
create index notes_fts on notes using gin (to_tsvector('simple', title));
```

> Durations are **beats**; mapping beats ⇄ real time is handled by the domain’s quantizer using `tempo`, `start_ts`, `end_ts`, and (later) working calendars.&#x20;

### 7.2 CRDT document (per‑Score Yjs)

```
YDoc: Map {
  notes: Map<noteId -> Map{ title, startBeat, durationBeats, meta }>,
  deps:  Map<depId  -> Map{ srcId, dstId }>,
  prefs: Map{ gridZoom, theme, ... }
}
```

- Persist CRDT **updates** locally and remotely; **materialize** to Postgres for queries.
- **Snapshots** hourly (server) and on critical client actions.

### 7.3 Local persistence (SQLite)

- Web: SQLite **WASM** with **OPFS**; Mobile/Desktop: native SQLite binding.
- Persist: last known CRDT state (+ index of deltas), user preferences, cached materialized views for fast load.

---

## 8) Algorithms (reference implementations)

### 8.1 Beat quantization

```
Inputs: score.start_ts, score.end_ts, tempo, measure_duration (derived)
beat_length = measure_duration / tempo

toBeat(ts):
  delta = clamp(ts, start_ts, end_ts) - start_ts
  return floor(delta / beat_length)

toTs(beat):
  return start_ts + beat * beat_length
```

- **Chord grouping:** Notes sharing identical `startBeat` form a chord.&#x20;

### 8.2 DAG validation & topological ordering

```
validateNoCycle(graph):
  colors = Map<note, WHITE>
  dfs(n):
    if colors[n] == GRAY -> cycle
    if colors[n] == BLACK -> return
    colors[n] = GRAY
    for each m in out(n): dfs(m)
    colors[n] = BLACK
  for each n in V: if colors[n]==WHITE: dfs(n)
```

### 8.3 Lane assignment (melody alignment; O(N log L))

```
placeNotes(notes, edges):
  order = topoSort(notes, edges).tieBreakBy(startBeat)
  lanes = array of minheaps  // each stores endBeat of last note
  laneOf = Map<note, laneIndex>

  for n in order:
    pref = laneOf.get(maxPred(n))  // predecessor with latest endBeat
    if pref != null and lanes[pref].peakEndBeat <= n.startBeat:
       lane = pref
    else:
       lane = nearestFreeLane(lanes, n.startBeat) or createNewLane()
    laneOf[n] = lane
    lanes[lane].push(n.endBeat)

  smooth(laneOf, notes, edges)  // pull short detours back to pred lane
  return laneOf
```

**Acceptance for alignment:** For A→B→C, all placed on the same lane unless concurrency/occupancy blocks; fan‑outs keep one dependent on the predecessor lane, others in adjacent lanes minimizing vertical distance.&#x20;

---

## 9) Rendering engine & interactions

### 9.1 Draw grammar (portable)

- **Layers:**

  1. Background: staff lines (5 lines), paper grain (optional), measure bars + labels.
  2. Notes: rounded rect pills with titles; width = `durationBeats * beatPx`.
  3. Connectors: orthogonal polylines; short vertical hops for fan‑outs.

- **Virtualization:** Maintain spatial index of visible items; render _(viewport ± one screen)_ only.

- **Hit‑testing:** Use simplified rect/segment proxies; map to underlying note IDs.

- **Gestures:** Drag (snap to beat), multi‑select, marquee, pinch/wheel zoom; keyboard nudges (±1 beat, ±1 measure).

- **Accessibility:** Roles & labels for screen readers; focus rings; fully keyboard operable.

### 9.2 Backends

- **Web/Electron:** PixiJS (WebGL2) scene; cache staff/measure layers as reusable textures.
- **Mobile (RN):** RN‑Skia canvas; mirror the same surface API as PixiJS.

---

## 10) API surface

### 10.1 GraphQL schema (excerpt)

```graphql
scalar DateTime
scalar JSON

type Score {
  id: ID!
  name: String!
  startTs: DateTime!
  endTs: DateTime!
  tempo: Int!
  notes: [Note!]!
  dependencies: [Dependency!]!
}

type Note {
  id: ID!
  scoreId: ID!
  title: String!
  startBeat: Int!
  durationBeats: Int!
  laneIndex: Int
  meta: JSON
}

type Dependency {
  srcNoteId: ID!
  dstNoteId: ID!
}

type Query {
  score(id: ID!): Score
  listScores: [Score!]!
}

input UpsertNoteInput {
  id: ID
  scoreId: ID!
  title: String!
  startBeat: Int!
  durationBeats: Int! = 1
  meta: JSON
}

type Mutation {
  upsertScore(
    name: String!
    startTs: DateTime!
    endTs: DateTime!
    tempo: Int!
  ): Score!
  updateScore(
    id: ID!
    name: String
    startTs: DateTime
    endTs: DateTime
    tempo: Int
  ): Score!
  deleteScore(id: ID!): Boolean!

  upsertNote(input: UpsertNoteInput!): Note!
  deleteNote(scoreId: ID!, id: ID!): Boolean!

  linkDependency(scoreId: ID!, src: ID!, dst: ID!): Dependency!
  unlinkDependency(scoreId: ID!, src: ID!, dst: ID!): Boolean!
}

type Subscription {
  scoreEvents(scoreId: ID!): ScoreEvent!
}
```

- **Resolvers:** Validate DAG on `linkDependency`; reject cycles; emit events to Redis pub/sub.
- **AuthZ:** Owner can CRUD; shared users (post‑MVP) via ACLs on `scores`.

### 10.2 Realtime gateway

- Expose **y‑websocket** compatible endpoints: `wss://…/y/<scoreId>`.
- Authenticate connection via JWT; authorize room membership.
- Broadcast CRDT updates to peers; persist update frames; snapshot periodically.

---

## 11) Client application specs

### 11.1 Web (React)

- **Routing:** `/scores/:id` (single score), `/` (list), `/portfolio` (multi‑score).
- **State:** `@cadence/crdt` hooks expose a YDoc proxy; `@cadence/domain` methods mutate safely.
- **Components:** `TimelineCanvas`, `NotePill`, `MeasureRuler`, `DependencyLayer`, `InspectorPanel`.
- **Keyboard map:** arrows (nudge), shift+arrows (bigger step), cmd/ctrl‑z/y (undo/redo), delete, enter (edit).
- **Persistence:** IndexedDB OPFS SQLite; CRDT stored via `y-indexeddb` + custom SQLite sink.

### 11.2 Desktop (Electron)

- Wrap the web app; add native menus, global shortcuts, file handlers (import/export), auto‑update.
- Enable deeper OS integrations later (tray, recent files).

### 11.3 Mobile (React Native)

- **Navigation:** Stack navigator: Scores list → Score timeline.
- **Canvas:** RN‑Skia renderer backend; gesture handler for pinch/drag.
- **Storage:** SQLite; CRDT persisted via `y-sqlite` provider (lightweight).

---

## 12) Offline‑first & sync design

- **Local‑only mode:** All edits land in YDoc + SQLite; export/import a **Score bundle** (CRDT snapshot + assets).
- **Device sync:** WebSocket rooms; CRDT deltas up/down; server persists **append‑only** updates and **hourly snapshots**.
- **Materialized views:** Workers reify documents to Postgres (notes, deps) for queries and search.
- **Conflict handling:** CRDT merges content; **server DAG validator** refuses illegal edge insertions (cycles) and returns helpful error payloads for client UI to propose fixes.

---

## 13) Security, privacy, multi‑tenancy

- JWTs from OIDC provider (Auth0/Clerk/Cognito).
- Every resolver checks `score.owner_id == ctx.userId` (or ACL in future).
- Rate limits at gateway; WebSocket connection caps; Redis‑backed token buckets.
- Data encrypted at rest (RDS, S3); TLS in transit.

---

## 14) Observability & operations

- **OTel** instrumentation in client (optional), API, Realtime, Workers.
- Dashboards: request P95, WS room counts, long frames, worker queue depths.
- **SLOs:** 99.9% API availability; 99.9% WS uptime during business hours; error budget alerts.

---

## 15) Testing strategy

- **Unit (packages/domain):**

  - Quantizer property tests; edge date ranges.
  - DAG cycle detection; topological order.
  - Lane assignment invariants (chain continuity; minimal vertical spread).

- **Golden (renderer):**

  - Snapshot images at multiple zooms; chords; fan‑out/fan‑in cases.

- **Integration (client):**

  - Drag/resize/link flows; keyboard shortcuts; offline edits → restart → recovery.

- **API e2e:**

  - GraphQL queries/mutations; auth; DAG rejection; import/export round‑trip.

- **Performance:**

  - 1k notes/2k deps scenarios; measure frame time; ensure ≤16 ms median.

---

## 16) Build, packaging, and CI/CD

- **CI:** GitHub Actions: lint/test/typecheck → build artifacts (Web, Electron, RN, Services) → container images to registry.
- **Infra:** Terraform: EKS, RDS Postgres, ElastiCache Redis, S3/CloudFront; secrets via AWS SSM.
- **Releases:**

  - Web: CloudFront invalidation.
  - Electron: code‑signed installers + auto‑updates.
  - Mobile: App Store / Play Store; CodePush‑style OTA for JS bundles where possible.
  - Services: Rolling deploy on EKS; DB migrations via Prisma/Drizzle migrations.

---

## 17) Implementation plan (LLM‑oriented tasks)

> The following tasks are **sequenced** and **executable** by an engineering LLM. Each task includes “done when” criteria.

### Phase 1 — Foundation (offline MVP) — 4–6 weeks

1. **Monorepo bootstrap**

   - Create `apps`, `services`, `packages`, `infra` structure; configure pnpm, TSConfig, ESLint/Prettier.
   - _Done when:_ `pnpm -r build` succeeds across empty stubs.

2. **Domain package (`@cadence/domain`)**

   - Implement models, quantizer, DAG cycle check, topological sort, **lane assignment** as per §8.
   - Unit tests with property checks.
   - _Done when:_ All tests green; API documented via TSDoc.

3. **Renderer package (`@cadence/renderer`)**

   - Define draw grammar; implement PixiJS backend; expose `render(state, viewport)`.
   - Golden snapshot tests for fixtures.
   - _Done when:_ Renders reference scenes deterministically.

4. **CRDT package (`@cadence/crdt`)**

   - YDoc definitions; providers: `y-indexeddb` (web) + SQLite sink; serialization of bundle.
   - _Done when:_ Create/edit notes offline; restart restores state.

5. **Web app (`apps/web`)**

   - TimelineCanvas, inspector, gestures; keyboard map; import/export.
   - _Done when:_ Demo score editable offline; chords/lanes render per §9; acceptance in §5 passes locally.

6. **Desktop shell (`apps/desktop`)**

   - Electron wrapper; menus; auto‑update stub.
   - _Done when:_ Desktop app mirrors web UX; import/export via OS file dialog.

7. **Mobile app (`apps/mobile`)**

   - RN + RN‑Skia renderer backend; basic timeline interactions.
   - _Done when:_ Drag/zoom/snap operational; storage persists locally.

### Phase 2 — Sync & resources — 4–6 weeks

8. **API service (`services/api`)**

   - Fastify + GraphQL; resolvers; Prisma/Drizzle models for schema in §7.1; JWT auth; DAG validation.
   - _Done when:_ e2e tests pass; Postgres migrations applied.

9. **Realtime gateway (`services/realtime`)**

   - y‑websocket compatible server; JWT auth; Redis pub/sub; snapshots to S3/PG.
   - _Done when:_ Two devices converge on edits; subscriptions reflect changes.

10. **Workers (`services/workers`)**

- Indexing; export/import; server‑side DAG checks on deltas.
- _Done when:_ Background jobs run; failures alerted.

11. **Resource assignment (light)**

- `note_assignments` table; over‑allocation detection; red ticks; basic auto‑level within measure.
- _Done when:_ UI flags overloads; “Level within measure” works.

### Phase 3 — Forecast & polish — 4–6 weeks

12. **Baselines & variance**

- Baseline snapshots; overlay shadows; variance report.
- _Done when:_ Baseline compare toggles and persists.

13. **Monte‑Carlo forecast**

- Optional min/most‑likely/max durations; simulation; P50/P80 markers on timeline.
- _Done when:_ Forecast panel shows percentiles; perf within budget.

14. **Portfolio alignment**

- Shared axis mode; synchronized scroll; minimap.
- _Done when:_ Multi‑Score view behaves per §5.

15. **A11y + performance passes**

- WCAG AA; SR labels; frame time budget met; memory under control.

> Many of these improvements trace directly to the design’s multi‑score view, aligned dependencies, and offline‑first requirements.&#x20;

---

## 18) Code standards & tooling

- **TypeScript** strict; ESLint (airbnb+custom); Prettier; commit hooks with lint‑staged.
- **Testing:** Vitest/Jest; Playwright for e2e; image snapshot tooling for renderer.
- **Docs:** TSDoc + Storybook (timeline components in mock mode).

---

## 19) Example artifacts (for immediate use)

### 19.1 Score bundle (export) — canonical JSON

```json
{
  "version": "1",
  "score": {
    "id": "9f6f…",
    "name": "Release 1.0",
    "startTs": "2025-09-01T00:00:00Z",
    "endTs": "2025-10-15T00:00:00Z",
    "tempo": 4
  },
  "doc": {
    "notes": {
      "a1": {
        "title": "Build",
        "startBeat": 0,
        "durationBeats": 2,
        "meta": {}
      },
      "b2": { "title": "Test", "startBeat": 2, "durationBeats": 2, "meta": {} },
      "c3": {
        "title": "Deploy",
        "startBeat": 4,
        "durationBeats": 1,
        "meta": {}
      }
    },
    "deps": {
      "d1": { "srcId": "a1", "dstId": "b2" },
      "d2": { "srcId": "b2", "dstId": "c3" }
    },
    "prefs": { "gridZoom": 1.0 }
  }
}
```

### 19.2 Lane assignment test (property‑style)

```
Given: Chain A→B→C with startBeat spacing >= duration
Expect: lane(A) == lane(B) == lane(C)
And: For fan-out A→B, A→C starting same beat, {lane(B), lane(C)} are adjacent
```

### 19.3 GraphQL example

```graphql
mutation {
  upsertScore(
    name: "Alpha"
    startTs: "2025-09-01T00:00:00Z"
    endTs: "2025-10-01T00:00:00Z"
    tempo: 4
  ) {
    id
  }
}
```

---

## 20) Risks & mitigations

- **Canvas perf on low‑end:** Prefer WebGL (PixiJS); cache static layers; dirty‑rect painting; virtualize.
- **CRDT growth:** Periodic snapshot/compaction; compress update frames.
- **Electron bloat:** Thin shell; share web code; lazy‑load tooling.
- **Gesture parity:** Unified gesture semantics; shared tests across platforms.
- **DAG conflicts on sync:** Server‑side validator rejects illegal merges with actionable errors.

---

## 21) Mapping to original design (coverage checklist)

- **Core model (Score/Measure/Chord/Note)** → §2, §7, §8, §9; GPU canvas renders notes/chords with measures and staff lines.&#x20;
- **Dependencies & “melody” alignment** → §5 FR‑3/FR‑4, §8.3 lane algorithm, §9 connectors.&#x20;
- **Multi‑Score view** → §5 FR‑5, §11 portfolio alignment.&#x20;
- **Offline‑first now, sync later** → §5 FR‑6, §12 CRDT + WebSocket design, §7.2/7.3 persistence.&#x20;
- **Cross‑platform delivery** → §3 architecture, §11 client specs (Web/Electron/RN).&#x20;
- **UI theming & staff/measure visuals** → §9 draw grammar (staff lines, measures, chords).&#x20;
- **Implementation details & MVVM‑like separation** → §3 monorepo, §4 selections, §17 task list.&#x20;

---

### Final notes for the engineering LLM

- Implement **packages/domain** first (deterministic algorithms + tests). The **renderer** consumes only pure state and a viewport—keep it stateless and deterministic for golden tests.
- Persist a **CRDT document per Score**; never mutate Postgres directly from clients—server materializes from CRDT to maintain a single source of truth for queries.
- Keep gestures and hit‑testing fast by separating **interaction geometry** (simple rect/segments) from **display geometry**.
- Block dependency cycles immediately in the client (optimistic validation) and in the server (authoritative check) with **helpful remediation suggestions**.

_This specification is sufficient for an LLM‑driven engineering agent to scaffold, implement, test, and ship Cadence from scratch, while preserving the musical metaphor and offline‑first, cross‑platform requirements defined in the original design._&#x20;
