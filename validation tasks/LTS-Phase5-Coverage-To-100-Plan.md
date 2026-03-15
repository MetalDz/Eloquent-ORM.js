# LTS Phase 5: Coverage To 100 Plan

Last updated: 2026-03-15  
Status: IN PROGRESS

## Goal
- Drive the package from high coverage to a true LTS-grade `100%` gate across statements, branches, functions, and lines.

## Current Validated Baseline
Baseline captured from `npm run test:coverage` on `2026-03-15`:
- Statements   : `92.52% (5678/6137)`
- Branches     : `87.35% (2963/3392)`
- Functions    : `92.28% (921/998)`
- Lines        : `92.87% (5383/5796)`

Kickoff note:
- The refresh run exposed one stale docs assertion in `src/lab_test/public.model.alias-and-entry.logic.test.ts`.
- That regression has already been corrected in this kickoff slice so the Phase 5 work starts from a truthful baseline.

## Coverage Execution Rules
- Every active hotspot slice must ship with:
  - a dedicated `.md`
  - a dedicated `.test`
  - explicit validation evidence
- No shipped runtime or CLI file may remain below target without an active tracked slice.
- Global `npm run test:coverage` remains the LTS release gate.

## Ordered Hotspot Inventory

### A. Operational CLI and Helper Hotspots
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

## Release Gate
- LTS promotion remains blocked until:
  - `npm run test:coverage` reports `100%`
  - no hotspot file remains without a tracked slice
  - the final coverage pass is reflected in the master LTS plan
