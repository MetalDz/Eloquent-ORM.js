# ORM Hardening Phase 1 CLI Bootstrap Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull CLI bootstrap-only flag and environment interpretation out of `src/cli/eloquent.ts` into a dedicated helper module without changing command behavior.

## Scope
- Extract helper logic for:
  - `--test` detection
  - CLI test-connection environment override
  - requested storage-kind resolution for factory loading
  - factory auto-load command gating
- Keep command registration and command actions in `src/cli/eloquent.ts`.

## Non-Goals
- No command option surface changes.
- No command routing changes.
- No production-safety behavior changes.
- No logging bootstrap refactor in this slice.

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates bootstrap flag/env interpretation to a helper module.
- The helper behavior is covered by a focused test file.
- Existing CLI surface tests still pass unchanged.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime contract test
- Existing CLI surface test
- `npm run typecheck`
