# ORM Hardening Phase 1: CLI Make Artifact Command Registration Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the remaining low-risk `make:*` artifact registrations from `src/cli/eloquent.ts`.

## Scope
- Move `make:seed`, `make:factory`, and `make:scenario` registration into a shared helper.
- Keep the public CLI surface unchanged.
- Keep production-test gating and action wrapping behavior attached to the extracted commands.

## Files
- `src/cli/utils/CliMakeArtifactCommandRegistration.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/orm.hardening.phase1.cli-make-artifact-command-registration.logic.test.ts`
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Acceptance Criteria
- `src/cli/eloquent.ts` delegates `make:seed`, `make:factory`, and `make:scenario` wiring to a helper.
- The helper owns the command definitions and preserves flags and safety checks.
- The CLI surface contract continues to cover the extracted definitions.

## Validation
- Focused Jest coverage for the helper and CLI surface contract.
- `npm run typecheck`
