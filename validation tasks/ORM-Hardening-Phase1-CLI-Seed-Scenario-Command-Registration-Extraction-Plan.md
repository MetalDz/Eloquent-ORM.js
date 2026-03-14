# ORM Hardening Phase 1: CLI Seed Scenario Command Registration Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the seed and scenario execution registration block from `src/cli/eloquent.ts`.

## Scope
- Move `db:seed`, `db:seed:precheck`, `db:seed:fresh`, and `demo:scenario` registration into a shared helper.
- Keep the public CLI surface unchanged.
- Preserve production/test gating, precheck flow, driver target resolution, and action wrapping.

## Files
- `src/cli/utils/CliSeedScenarioCommandRegistration.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-seed-scenario-command-registration.logic.test.ts`
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates the seed/scenario registration block to a helper.
- The helper owns the command definitions and preserves current flags and behaviors.
- The CLI surface contract continues to verify the extracted definitions.

## Validation
- Focused Jest coverage for the helper and CLI surface contract.
- `npm run typecheck`
