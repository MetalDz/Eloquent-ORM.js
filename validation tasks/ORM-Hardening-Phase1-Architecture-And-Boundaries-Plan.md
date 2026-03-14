# ORM Hardening Phase 1: Architecture and Public Boundaries Plan

Last updated: 2026-03-14  
Status: IN PROGRESS

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
- `src/core/model/CoreModel.ts` (`783` lines)
- `src/core/model/BaseModel.ts` (`355` lines)
- `src/cli/eloquent.ts` (`1042` lines)

## Non-Goals
- No mass rewrite of model inheritance.
- No breaking rename of public model exports.
- No behavior-only refactor without a contract test to pin the surface.

## Proposed Work Slices
- Add a model/export boundary matrix to the implementation notes.
- Lock tests around the default runtime stack used by generated models.
- Separate "core persistence behavior" from "composed convenience surface" conceptually before further extraction.
- Record which responsibilities should remain in `CoreModel` versus helpers.

## Completed Phase 1 Slices
- `src/core/model/CoreModelPersistenceState.ts`
  - extracted primary-key resolution, persisted snapshots, assignable payload checks, dirty tracking, and Mongo primary-key filter helpers
- `src/core/model/CoreModelValidationEvents.ts`
  - extracted hook-disable evaluation, schema-driven validation rule assembly, validation dispatch, and lifecycle event cancellation handling
- `src/cli/utils/CliBootstrapSupport.ts`
  - extracted CLI test-mode env override, requested storage-kind resolution, and factory auto-load command gating from `src/cli/eloquent.ts`
- `src/cli/utils/CliCommandTargets.ts`
  - extracted repeated driver-target resolution and primary-connection selection from `src/cli/eloquent.ts` command actions
- `src/cli/utils/CliActionRuntime.ts`
  - extracted repeated async action error handling from `src/cli/eloquent.ts` command actions
- `src/cli/utils/CliProductionGuards.ts`
  - extracted production guard enforcement from `src/cli/eloquent.ts` so command actions only reference the shared guard helper
- `src/cli/utils/CliCommandCatalog.ts`
  - extracted the inline `list` help table from `src/cli/eloquent.ts` so command-help metadata has a single owner
- `src/cli/utils/CliPresentation.ts`
  - extracted the startup banner and presentation lines from `src/cli/eloquent.ts`

## Acceptance Criteria
- The role of `CoreModel`, `BaseModel`, and public exports is explicit and testable.
- `BaseModel`, `SqlModel`, and `MongoModel` resolve to the intended default runtime stack.
- Future refactors have named extraction targets instead of ad hoc edits in hotspot files.
- No runtime behavior regresses while boundary contracts are being frozen.

## Validation Strategy
- Contract test for this plan file.
- Focused package-surface and BaseModel/runtime tests.
- `npm run typecheck`
