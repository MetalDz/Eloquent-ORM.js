# LTS Phase 5 MakeFactory Coverage And ASCII Plan

Last updated: 2026-03-16 08:59  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/commands/makeFactory.ts`.
- Remove mojibake from the shipped `make:factory` runtime strings.

## Scope
- `src/cli/commands/makeFactory.ts`
- `src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts`

## Targeted Gaps
- defaulted `options` branch
- nullish `fields` / `relations` / `features` fallback branches
- `hasMany` relation example branch
- `morphTo` relation example branch
- default relation-example branch for unrecognized relation kinds
- missing field-type faker fallback branch
- `Error` catch path that logs both the message and the stack
- `Error` catch path when no stack is present
- corrupted CLI output markers in the `make:factory` runtime surface

## Completion Notes
- Normalized `makeFactory.ts` runtime strings to ASCII `WARN:` / `INFO:` / `ERROR:` text.
- Added focused regression coverage for:
  - defaulted CLI options and nullish analysis metadata
  - `hasMany` relation example rendering
  - `morphTo` relation example rendering
  - fallback example rendering for an unknown relation kind
  - missing field-type fallback to `lorem.word()`
  - `Error` instance logging with message and stack
  - `Error` instance logging without a stack line

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts src/lab_test/cli.generators.integration.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts src/lab_test/repo.wide.mojibake.remediation.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeFactory.ts --runTestsByPath src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts src/lab_test/cli.generators.integration.test.ts`
- `npm.cmd run typecheck`
