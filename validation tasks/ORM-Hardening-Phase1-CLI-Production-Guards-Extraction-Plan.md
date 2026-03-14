# ORM Hardening Phase 1 CLI Production Guards Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull production guard evaluation out of `src/cli/eloquent.ts` into a dedicated helper module without changing command surfaces.

## Scope
- Extract helper logic for:
  - destructive-command production override enforcement
  - test-only production enforcement
  - shared `console.error(...)` plus `process.exitCode = 1` handling for guard failures
- Keep actual command registration and command actions in `src/cli/eloquent.ts`.

## Non-Goals
- No changes to `ProductionSafety` semantics.
- No command option changes.
- No command routing changes.
- No CLI logging bootstrap changes.

## Acceptance Criteria
- `src/cli/eloquent.ts` no longer owns production guard helper functions directly.
- The extracted helper is covered by a focused test file.
- Existing CLI surface tests still pass.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime contract test
- Existing CLI surface test
- `npm run typecheck`
