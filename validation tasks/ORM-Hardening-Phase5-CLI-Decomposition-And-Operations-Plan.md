# ORM Hardening Phase 5: CLI Decomposition and Operations Plan

Last updated: 2026-03-14  
Status: IN PROGRESS

## Goal
- Reduce command-routing complexity in the CLI while hardening the weakest operational modules and keeping production safety explicit.

## Scope
- Break down responsibilities in:
  - `src/cli/eloquent.ts`
  - command registration / flag routing
  - shared driver-targeting helpers
- Raise confidence in low-coverage operational files:
  - `src/cli/commands/demoScenario.ts`
  - `src/cli/commands/makeController.ts`
  - `src/cli/commands/makeService.ts`
  - `src/cli/utils/ModelIntrospector.ts`
  - `src/cli/utils/fileWriter.ts`
  - `src/cli/utils/migrations/MongoMigrationTracker.ts`

## Current Hotspots
- `src/cli/eloquent.ts` (`1042` lines)
- `src/cli/commands/demoScenario.ts`: branches `25%`
- `src/cli/commands/makeController.ts`: branches `0%`
- `src/cli/commands/makeService.ts`: branches `0%`
- `src/cli/utils/ModelIntrospector.ts`: branches `0%`
- `src/cli/utils/fileWriter.ts`: branches `30%`

## Non-Goals
- No breaking CLI flag removals without a migration plan.
- No hidden production bypass for `make:factory`, `make:seed`, `make:scenario`, or `db:seed`.
- No command-surface growth without targeted tests.

## Proposed Work Slices
- Isolate command registration concerns from command implementation concerns.
- Add dedicated tests for the lowest-coverage operational helpers.
- Keep built CLI and pack-smoke coverage aligned with direct command tests.
- Preserve explicit production/test gating across all drivers.
- [x] Start with `fileWriter` create/skip/overwrite/error branch coverage and deterministic console reporting.
- [x] Harden `ModelIntrospector` extraction and cache invalidation behavior with dedicated tests.
- [x] Harden `makeController` and `makeService` routing/logging with direct command tests and shared scaffold support.
- [x] Keep package publish whitelist aligned with the built `dist` root and pack-smoke expectations.
- [x] Keep `pack-smoke` npm packaging isolated from the user-global npm cache.

## Acceptance Criteria
- `eloquent.ts` has a clearer operational boundary and less direct responsibility concentration.
- The current lowest-coverage CLI/helper files have dedicated tests and materially better coverage.
- Built CLI targeting and pack-smoke flows cover both SQL and Mongo scenario/seed lifecycles for touched areas.
- Production safety behavior remains explicit and testable across drivers.

## Validation Strategy
- Contract test for this plan file.
- Focused command/helper tests for the touched hotspots.
- `npm run typecheck`
- `npm run build`
- `npm run test:pack-smoke`
