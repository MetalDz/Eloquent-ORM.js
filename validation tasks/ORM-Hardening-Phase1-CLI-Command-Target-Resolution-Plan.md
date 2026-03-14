# ORM Hardening Phase 1 CLI Command Target Resolution Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull repeated driver-target normalization out of `src/cli/eloquent.ts` command actions into a dedicated helper without changing command behavior.

## Scope
- Extract helper logic for:
  - command-level connection target resolution from `--mysql/--pg/--sqlite/--mongo/--all-connections`
  - primary connection selection for single-target commands like `demo:scenario`
  - preservation of test-mode routing through `--test`
- Keep command option declarations and command implementations in `src/cli/eloquent.ts`.

## Non-Goals
- No command option surface changes.
- No changes to `resolveConnectionFlags.ts` semantics.
- No changes to command execution order.
- No production-safety refactor in this slice.

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates repeated connection-target resolution to a helper module.
- The helper behavior is covered by a focused test file.
- Existing CLI surface and connection-flag tests still pass.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime contract test
- Existing CLI surface and connection-flag tests
- `npm run typecheck`
