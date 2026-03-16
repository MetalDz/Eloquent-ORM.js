# LTS Phase 5 CLI Entrypoint Coverage Plan

Last updated: 2026-03-16 12:48  
Status: IN PROGRESS

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/eloquent.ts`.

## Scope
- `src/cli/eloquent.ts`
- `src/lab_test/lts.phase5.cli-entrypoint-coverage.logic.test.ts`

## Targeted Gaps
- CLI log-file installation in text and JSON modes
- runtime bootstrap success, skip, and failure flows
- factory autoload skip, success, and failure flows
- program construction and registration delegation
- `runCli(...)` environment setup, parse, and help-output flow
- entrypoint placeholder fallback

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.cli-entrypoint-coverage.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/eloquent.ts --runTestsByPath src/lab_test/lts.phase5.cli-entrypoint-coverage.logic.test.ts`
- `npm.cmd run typecheck`
