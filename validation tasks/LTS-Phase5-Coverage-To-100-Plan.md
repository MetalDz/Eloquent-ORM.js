# LTS Phase 5: Coverage To 100 Plan

Last updated: 2026-03-15  
Status: IN PROGRESS

## Goal
- Drive the package from high coverage to a true LTS-grade `100%` gate across statements, branches, functions, and lines.

## Current Reported Baseline
Latest full-suite snapshot reported on `2026-03-15`:
- Statements   : `96.47% (5885/6100)`
- Branches     : `91.13% (3065/3363)`
- Functions    : `95.78% (954/996)`
- Lines        : `96.82% (5579/5762)`

Progress note:
- The kickoff refresh exposed one stale docs assertion in `src/lab_test/public.model.alias-and-entry.logic.test.ts`.
- That regression was corrected, and subsequent Phase 5 slices moved the full-suite baseline upward from the original kickoff snapshot.

## Coverage Execution Rules
- Every active hotspot slice must ship with:
  - a dedicated `.md`
  - a dedicated `.test`
  - explicit validation evidence
- No shipped runtime or CLI file may remain below target without an active tracked slice.
- Global `npm run test:coverage` remains the LTS release gate.

## Ordered Hotspot Inventory

### A. Operational CLI and Helper Hotspots
- `src/cli/commands/factoryStatus.ts`
- `src/cli/utils/factories/FactoryGraph.ts`
- `src/cli/utils/factories/FactoryRegistry.ts`
- `src/cli/utils/factories/FactoryLoader.ts`
- `src/cli/utils/migrations/MongoMigrationTracker.ts`
- `src/cli/utils/ModelIntrospector.ts`
- `src/cli/commands/makeController.ts`
- `src/cli/commands/makeService.ts`
- `src/cli/utils/fileWriter.ts`

### B. Migration and Runtime Branch Hotspots
- `src/cli/commands/migrateRollback.ts`
- `src/cli/commands/migrateRun.ts`
- `src/cli/commands/migrateStatus.ts`
- `src/core/connection/DatabaseConnection.ts`

### C. Scenario and Generator Hotspots
- `src/cli/commands/demoScenario.ts`
- `src/cli/commands/makeMigration.ts`
- `src/cli/commands/makeScenario.ts`

### D. Residual Runtime Surface Hotspots
- `src/core/model/BaseModel.ts`
- `src/core/cache/CacheFallbackManager.ts`
- `src/core/cache/drivers/FileCacheDriver.ts`

## Initial Slice Order
1. Close the low-risk operational helpers first:
   - `ModelIntrospector`
   - `makeController`
   - `makeService`
   - `fileWriter`
2. Close the migration tracker and rollback/run branches.
3. Close scenario/demo and generator edge branches.
4. Finish residual runtime misses and rerun the full gate after each slice cluster.

## Completed Slice Tracking
- [x] Factory runtime coverage is now tracked in `LTS-Phase5-Factory-Runtime-Coverage-Plan.md`.
  - Scope: `factoryStatus`, `FactoryGraph`, `FactoryRegistry`, and `FactoryLoader`.
  - Clean-up: removed the unused local `generateGraph(...)` helper from `factoryStatus.ts` so the command delegates only to the shared graph runtime.
  - Focused cluster snapshot after the slice: statements `99.37%`, branches `83.51%`, functions `100%`, lines `100%`.
- [x] `src/cli/commands/migrateRollback.ts` is now tracked in `LTS-Phase5-MigrateRollback-Coverage-Plan.md` with dedicated Mongo/runtime branch coverage.
  - Focused snapshot after the slice: statements `97.6%`, branches `84.52%`, functions `100%`, lines `100%`.
- [x] `src/cli/commands/migrateRun.ts` is now tracked in `LTS-Phase5-MigrateRun-Coverage-Plan.md` with dedicated Mongo/runtime branch coverage.
  - Focused snapshot after the slice: statements `99.03%`, branches `93.57%`, functions `100%`, lines `100%`.

## Release Gate
- LTS promotion remains blocked until:
  - `npm run test:coverage` reports `100%`
  - no hotspot file remains without a tracked slice
  - the final coverage pass is reflected in the master LTS plan
