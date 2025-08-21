# Cadence — Project Composer (v0.1 Implementation)

**Status:** MVP Implemented
**Date:** August 20, 2025

This repository contains the v0.1 implementation of Cadence, a project management application based on a musical metaphor, as defined in the comprehensive specification.

## Overview

Cadence is designed as an offline-first, single-user desktop application. It features a sophisticated scheduling engine that combines the Critical Path Method (CPM) with a capacity-aware Serial Schedule Generation Scheme (SSGS) to optimize task scheduling for a single resource.

## Architecture

The solution is built using .NET (targeting .NET 10 preview) and Avalonia UI, adhering to Clean Architecture principles and the MVVM pattern.

```
/src
  /Cadence.Domain         # Core business logic, Entities, Value Objects, Graph algorithms, and the Scheduling Engine (SSGS, CPM).
  /Cadence.Application    # Use cases (Application Services), Ports (Interfaces for Repositories/Gateways).
  /Cadence.Infrastructure # Adapters: EF Core configurations, Repository implementations (SQLite).
  /Cadence.App            # UI Layer: Avalonia Views, ViewModels.
/tests
  /Cadence.Tests          # Unit tests for Domain logic.
```

## Key Features Implemented

*   **[FR5] Scheduling Engine:** Robust implementation of CPM and capacity-aware SSGS (ASAP). Handles dependencies, capacities, and ties across measures.
*   **[FR4] DAG Validation:** Explicit cycle detection prevents invalid project structures.
*   **[FR1-4] Domain Model:** Full implementation of Piece, Chord, Note, Measure, and Buffer concepts.
*   **[FR9] Unified Score View (UI):**
    *   Avalonia MVVM implementation.
    *   Visualization of the schedule (Gantt-like view).
    *   Selection and highlighting (T204, T214).
    *   Critical Path visualization and filtering (T209).
    *   Keyboard shortcuts for toggles (T211).
*   **[T100s] Persistence Infrastructure:** EF Core configurations and repository patterns established.

## Prerequisites

*   **.NET SDK (Preview):** Must have a .NET SDK installed that supports `net10.0` (e.g., .NET 10 Preview SDKs).

## Running the Application (Prototype)

The implemented solution includes a `MainWindowViewModel` that automatically generates a sample project and runs the scheduler upon startup, displaying the results in the UI.

```bash
# Navigate to the root directory
dotnet restore
dotnet build
dotnet run --project src/Cadence.App
```

## Limitations of this MVP

*   **Infrastructure:** EF Core packages and migrations cannot be executed in this environment. The code assumes they are present.
*   **ALAP (T143):** Backward scheduling is deferred.
*   **Advanced UI (T205-T208, T212-T213):** Edge bundling, structural overlays, and drag/resize interactions are not implemented.
*   **Calendar Integration (FR8):** Infrastructure is defined, but implementation is mocked or omitted.