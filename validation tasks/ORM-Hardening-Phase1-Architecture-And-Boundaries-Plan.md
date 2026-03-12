# ORM Hardening Phase 1: Architecture and Public Boundaries Plan

Last updated: 2026-03-12  
Status: PLANNED

## Goal
- Freeze and clarify the runtime ownership boundaries between `CoreModel`, `BaseModel`, mixins, relations, and public exports before larger refactors continue.

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
- Separate “core persistence behavior” from “composed convenience surface” conceptually before further extraction.
- Record which responsibilities should remain in `CoreModel` versus helpers.

## Acceptance Criteria
- The role of `CoreModel`, `BaseModel`, and public exports is explicit and testable.
- `BaseModel`, `SqlModel`, and `MongoModel` resolve to the intended default runtime stack.
- Future refactors have named extraction targets instead of ad hoc edits in hotspot files.
- No runtime behavior regresses while boundary contracts are being frozen.

## Validation Strategy
- Contract test for this plan file.
- Focused package-surface and BaseModel/runtime tests.
- `npm run typecheck`
