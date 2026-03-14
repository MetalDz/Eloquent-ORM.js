# ORM Hardening Phase 5: Scaffold Generator Operations Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Harden `makeController` and `makeService` as direct operational generator commands with clearer shared support.

## Scope
- Cover app/test output-path routing.
- Cover `--force` overwrite routing.
- Cover `make:controller --soft` restore-block rendering.
- Cover failure logging when template loading or rendering fails.
- Remove duplicate scaffold path/logging logic from the individual command files.

## Implemented
- Extracted shared scaffold naming, path resolution, and logging into `src/cli/utils/ScaffoldGeneratorSupport.ts`.
- Normalized `makeController` and `makeService` logging to deterministic ASCII messages through the shared helper.
- Added direct command tests for app/test, force, soft-delete, and failure branches.

## Acceptance Criteria
- `makeController()` writes to the correct app/test target path and renders the restore block only when `soft` is enabled.
- `makeService()` writes to the correct app/test target path and uses overwrite mode when `force` is enabled.
- Both commands log a created path only when the write helper succeeds.
- Both commands log a clear failure message when template generation fails.
