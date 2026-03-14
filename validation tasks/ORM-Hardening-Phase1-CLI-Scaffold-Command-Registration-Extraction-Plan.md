# ORM Hardening Phase 1: CLI Scaffold Command Registration Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the low-risk scaffold generator registrations from `src/cli/eloquent.ts`.

## Scope
- Move `make:model`, `make:controller`, and `make:service` registration into a shared helper.
- Keep the public CLI surface unchanged.
- Extend the CLI surface contract test so extracted command definitions remain covered.

## Files
- `src/cli/utils/CliScaffoldCommandRegistration.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-scaffold-command-registration.logic.test.ts`
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates scaffold command wiring to a helper.
- The helper owns `make:model`, `make:controller`, and `make:service`.
- Production override behavior remains attached to those commands.

## Validation
- Focused Jest coverage for the helper and CLI surface contract.
- `npm run typecheck`
