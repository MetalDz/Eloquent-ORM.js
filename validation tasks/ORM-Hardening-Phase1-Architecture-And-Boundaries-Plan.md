# ORM Hardening Phase 1: Architecture and Public Boundaries Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Freeze and clarify the runtime ownership boundaries between `CoreModel`, `BaseModel`, `SafeFinder`, relations, mixins, and public exports before larger refactors continue.

## Scope
- Document the responsibility split between:
  - `CoreModel`
  - `BaseModel`
  - `SafeFinder`
  - relation classes
  - serialization / eager-loading / soft-delete mixins
- Lock the public export contract for:
  - `BaseModel`
  - `SqlModel`
  - `MongoModel`
- Identify extraction targets in:
  - `src/core/model/CoreModel.ts`
  - `src/core/model/BaseModel.ts`
  - `src/cli/eloquent.ts`
- Track the concrete boundary matrix in:
  - `validation tasks/ORM-Hardening-Phase1-Implementation-Notes.md`

## Current Hotspots
- `src/core/model/CoreModel.ts` (`688` lines)
- `src/core/model/BaseModel.ts` (`305` lines)
- `src/cli/eloquent.ts` (`230` lines)

## Non-Goals
- No mass rewrite of model inheritance.
- No breaking rename of public model exports.
- No behavior-only refactor without a contract test to pin the surface.

## Proposed Work Slices
- [x] Add a model/export boundary matrix to the implementation notes.
- [x] Lock tests around the default runtime stack used by generated models.
- [x] Separate "core persistence behavior" from "composed convenience surface" conceptually before further extraction.
- [x] Record which responsibilities should remain in `CoreModel` versus helpers.
- [x] Extract CLI bootstrap, target routing, guard, and registration seams from `src/cli/eloquent.ts`.
- [x] Extract remaining low-risk `BaseModel` helper groupings into explicit seams.
- [x] Extract any remaining `CoreModel` safe-finder factory setup that should not stay inline.

## Completed Phase 1 Slices
- [x] `src/core/model/CoreModelPersistenceState.ts`
  - extracted primary-key resolution, persisted snapshots, assignable payload checks, dirty tracking, and Mongo primary-key filter helpers
- [x] `src/core/model/CoreModelValidationEvents.ts`
  - extracted hook-disable evaluation, schema-driven validation rule assembly, validation dispatch, and lifecycle event cancellation handling
- [x] `src/cli/utils/CliBootstrapSupport.ts`
  - extracted CLI test-mode env override, requested storage-kind resolution, and factory auto-load command gating from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliCommandTargets.ts`
  - extracted repeated driver-target resolution and primary-connection selection from `src/cli/eloquent.ts` command actions
- [x] `src/cli/utils/CliActionRuntime.ts`
  - extracted repeated async action error handling from `src/cli/eloquent.ts` command actions
- [x] `src/cli/utils/CliProductionGuards.ts`
  - extracted production guard enforcement from `src/cli/eloquent.ts` so command actions only reference the shared guard helper
- [x] `src/cli/utils/CliCommandCatalog.ts`
  - extracted the inline `list` help table from `src/cli/eloquent.ts` so command-help metadata has a single owner
- [x] `src/cli/utils/CliPresentation.ts`
  - extracted the startup banner and presentation lines from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliSupportCommandRegistration.ts`
  - extracted low-risk support command registration (`cache:*`, `factory:status`, `list`) from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliScaffoldCommandRegistration.ts`
  - extracted low-risk scaffold generator registration (`make:model`, `make:controller`, `make:service`) from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliMakeArtifactCommandRegistration.ts`
  - extracted low-risk artifact generator registration (`make:seed`, `make:factory`, `make:scenario`) from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliSeedScenarioCommandRegistration.ts`
  - extracted seed/scenario execution registration (`db:seed`, `db:seed:precheck`, `db:seed:fresh`, `demo:scenario`) from `src/cli/eloquent.ts`
- [x] `src/cli/utils/CliMigrationCommandRegistration.ts`
  - extracted migration registration (`make:migration`, `migrate:*`) from `src/cli/eloquent.ts`
- [x] `src/core/model/BaseModelSafeFinderStatics.ts`
  - extracted the `BaseModel` static safe-finder delegation block into an explicit model-layer seam
- [x] `src/core/model/CoreModelSafeFinderSupport.ts`
  - extracted safe-finder query construction and shared keyed-filter application out of `src/core/model/CoreModel.ts`

## Remaining Phase 1 Work
- [x] Review Phase 1 completion readiness before switching to Phase 2.
- No open Phase 1 tasks remain.

## Acceptance Criteria
- The role of `CoreModel`, `BaseModel`, and public exports is explicit and testable.
- `BaseModel`, `SqlModel`, and `MongoModel` resolve to the intended default runtime stack.
- Future refactors have named extraction targets instead of ad hoc edits in hotspot files.
- No runtime behavior regresses while boundary contracts are being frozen.

## Validation Strategy
- Contract test for this plan file.
- Focused package-surface and BaseModel/runtime tests.
- `npm run typecheck`
- Completion review:
  - `validation tasks/ORM-Hardening-Phase1-Completion-Review.md`
  - `src/lab_test/orm.hardening.phase1.completion-review.logic.test.ts`
