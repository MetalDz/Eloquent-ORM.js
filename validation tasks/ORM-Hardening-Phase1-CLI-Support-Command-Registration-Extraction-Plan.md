# ORM Hardening Phase 1: CLI Support Command Registration Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the low-risk support command registrations out of `src/cli/eloquent.ts` into a shared registration helper.

## Scope
- Move `cache:clear`, `cache:stats`, `factory:status`, and `list` registration into one helper.
- Keep the public CLI surface unchanged.
- Update the CLI surface test so extracted command sources are still parsed and verified.

## Files
- `src/cli/utils/CliSupportCommandRegistration.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-support-command-registration.logic.test.ts`
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates support-command registration to a helper.
- The helper owns the support command definitions and the `list` command still renders `CLI_COMMAND_CATALOG`.
- The CLI surface contract test still verifies the extracted commands.

## Validation
- Focused Jest coverage for the new helper and the command surface contract.
- `npm run typecheck`
