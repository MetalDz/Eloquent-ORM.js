# ORM Hardening Phase 1 CLI Action Error Wrapper Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull repeated async CLI action error handling out of `src/cli/eloquent.ts` into a dedicated helper without changing command intent.

## Scope
- Extract helper logic for:
  - unknown error to message normalization
  - default CLI error rendering
  - async action wrapping with `console.error(...)` and `process.exitCode = 1`
- Apply the helper only to command actions that already used local `try/catch` blocks.

## Non-Goals
- No command option surface changes.
- No command routing changes.
- No new error recovery behavior for commands that previously threw directly.
- No logging bootstrap refactor in this slice.

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates repeated action error handling to a helper module.
- The helper behavior is covered by a focused test file.
- Existing CLI surface tests still pass.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime contract test
- Existing CLI surface test
- `npm run typecheck`
