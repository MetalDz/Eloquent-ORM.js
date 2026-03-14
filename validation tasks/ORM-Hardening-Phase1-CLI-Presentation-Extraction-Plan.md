# ORM Hardening Phase 1: CLI Presentation Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the startup banner and presentation lines from `src/cli/eloquent.ts` into a shared helper.

## Scope
- Add a presentation helper for the ASCII banner and startup text.
- Replace inline banner rendering in `src/cli/eloquent.ts` with the helper call.
- Lock the extracted seam with a focused test.

## Files
- `src/cli/utils/CliPresentation.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-presentation.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` no longer renders the banner inline.
- The banner text and title remain unchanged.
- The helper is small and presentation-only.

## Validation
- Focused Jest coverage for the helper and wiring.
- `npm run typecheck`
