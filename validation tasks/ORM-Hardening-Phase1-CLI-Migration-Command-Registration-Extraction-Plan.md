# ORM Hardening Phase 1: CLI Migration Command Registration Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the migration command registration block from `src/cli/eloquent.ts`.

## Scope
- Move `make:migration`, `migrate:run`, `migrate:rollback`, `migrate:status`, `migrate:fresh`, and `migrate:reset` registration into a shared helper.
- Keep the public CLI surface unchanged.
- Preserve driver target resolution, action wrapping, and production guard behavior.

## Files
- `src/cli/utils/CliMigrationCommandRegistration.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-migration-command-registration.logic.test.ts`
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates migration command wiring to a helper.
- The helper owns the migration command definitions and preserves current flags and safety behavior.
- The CLI surface contract continues to verify the extracted definitions.

## Validation
- Focused Jest coverage for the helper and CLI surface contract.
- `npm run typecheck`
