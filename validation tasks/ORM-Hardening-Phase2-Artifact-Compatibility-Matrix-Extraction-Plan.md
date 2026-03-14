# ORM Hardening Phase 2: Artifact Compatibility Matrix Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Make storage-kind compatibility rules explicit and reusable across artifact routing.

## Scope
- Extract the storage-kind compatibility matrix out of `ArtifactStorage`.
- Centralize storage-kind collapse for grouped imports (`sql`, `mongo`, `mixed`, `unknown`).
- Keep targeted CLI routing behavior unchanged while making the rules explicit.

## Files
- `src/cli/utils/ArtifactCompatibility.ts`
- `src/cli/utils/ArtifactStorage.ts`
- `src/cli/commands/dbSeed.ts`
- `src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts`

## Acceptance Criteria
- Artifact compatibility rules are explicit in one helper module.
- Grouped imported kinds collapse deterministically to `sql`, `mongo`, `mixed`, or `unknown`.
- `ArtifactStorage` delegates compatibility decisions instead of inlining the matrix.
- Explicitly incompatible targeted flows can surface a clear reason.

## Validation
- Focused Jest coverage for the matrix helper and routing delegation.
- `npm run typecheck`
