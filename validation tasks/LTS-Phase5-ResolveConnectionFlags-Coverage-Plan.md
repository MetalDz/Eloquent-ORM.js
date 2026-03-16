# LTS Phase 5 ResolveConnectionFlags Coverage Plan

Last updated: 2026-03-16 11:07  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/resolveConnectionFlags.ts`.

## Scope
- `src/cli/utils/resolveConnectionFlags.ts`
- `src/lab_test/lts.phase5.resolve-connection-flags-coverage.logic.test.ts`

## Targeted Gap
- fallback from a missing test alias to the base runtime connection name
- null resolution when both runtime and test aliases are absent

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - `mongo_test` falling back to `mongo`
  - missing `mongo` and `mongo_test` returning `[]`
  - `--all-connections` filtering out missing driver aliases after resolution

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.resolve-connection-flags-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase37.connection-flags.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/resolveConnectionFlags.ts --runTestsByPath src/lab_test/lts.phase5.resolve-connection-flags-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase37.connection-flags.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`
