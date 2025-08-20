# Cadence (net10.0, Avalonia) — Offline‑first Project Composer

**Status:** scaffold / starter repo (combined **Score** view = time staff + structural overlay)

## Prerequisites
- Install **.NET 10 Preview SDK** (10.0.100-preview.*). This project targets `net10.0` and uses `global.json` with `"rollForward": "latestMajor", "allowPrerelease": true`.  
  See the .NET 10 preview blog and docs.
- Install an IDE (VS 2022 17.11+, Rider 2024.3+, or VS Code + C# Dev Kit).
- (Optional) Install `git` for version control.

## Build & Run
```bash
dotnet --info
dotnet restore
dotnet build
dotnet run --project src/Cadence.App/Cadence.App.csproj
```

## Solution layout
- `src/Cadence.Domain` — entities, value objects, scheduler interfaces, minimal scheduler stub.
- `src/Cadence.Infrastructure` — (placeholder) persistence contracts; SQLite/EF can be added here.
- `src/Cadence.App` — Avalonia desktop app; **Score** view (combined time+structure) + seed loader.
- `tests/Cadence.Tests` — basic unit tests (cycle detection sanity test).
- `tools/GptActions` — **OpenAPI** spec + a **Minimal API** stub so Custom GPTs can propose diffs and POST them for application/commit (see below).

## Combined **Score** view
- Time grid: measures (daily), capacity labels; notes render as pills sized by `DurationBeats` (tempo maps beats→minutes).
- Structure overlay: chord badges above the staff; Note→Chord connectors drawn as light orthogonal lines; selecting a note highlights its forward path to Piece.
- Toggle overlays: dependency edges on/off; align-by-schedule on/off (structural only — not a Gantt).

## Let Custom GPTs *see* and *edit* the repo

### See (read/analyze)
1) **Connect GitHub to ChatGPT** (Settings → Connectors → GitHub) and authorize the repos you want visible.  
   In chat, the model can reference your code and cite snippets.
2) Or, attach files directly to a **Project** in ChatGPT and chat inside the Project.

### Edit (propose/apply changes)
- **Preferred:** ask ChatGPT to generate **unified diffs (patches)** and then apply locally (or via the Patch Server below).  
- **Automated path via Custom GPT Action:**
  1. Host `tools/GptActions/patch-server` (ASP.NET Minimal API) locally and expose it with ngrok.
  2. In GPT Builder, add an **Action** using `tools/GptActions/openapi.yaml` and your ngrok URL.
  3. The GPT can then call `/apply`, `/commit`, `/branch`, `/push`, `/pr` to create branches and PRs.
     (You’ll need a GitHub PAT in the server’s environment to create PRs.)

⚠️ **Security**: protect the server with a Bearer token and only expose during a session; never share tokens with GPT responses.

## Next steps
- Flesh out EF Core in `Cadence.Infrastructure` with the provided DDL.
- Implement `SingleResourceScheduler` to replace the stub and wire it to the UI.
- Replace seed JSON with persistent storage and snapshot versioning.
- Add calendar upsert queue in Infrastructure.

## License
MIT
