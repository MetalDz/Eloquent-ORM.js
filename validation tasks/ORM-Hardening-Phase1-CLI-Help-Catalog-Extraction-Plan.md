# ORM Hardening Phase 1: CLI Help Catalog Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the inline `list` command table out of `src/cli/eloquent.ts` so command-help metadata has a single owner.

## Scope
- Add a shared CLI help catalog module.
- Make `src/cli/eloquent.ts` render the list command from that catalog.
- Lock the catalog shape and command coverage with a focused test.

## Files
- `src/cli/utils/CliCommandCatalog.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-help-catalog.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` no longer embeds the full help table inline.
- The shared catalog includes every public CLI command.
- The `list` command still renders the same command descriptions.

## Validation
- Focused Jest coverage for the catalog and CLI list wiring.
- `npm run typecheck`
