# LTS Phase 5 ImportResolver Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/ImportResolver.ts`.

## Scope
- `src/cli/utils/ImportResolver.ts`
- `src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts`

## Targeted Gap
- the `publicApiImportPath()` entrypoint was not pinned
- the package-name read failure fallback path was not covered

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - installed-package resolution with a custom package name
  - `publicApiImportPath()` outside the repo
  - `publicApiImportPath()` inside the repo
  - fallback to `eloquentjs` when `package.json` cannot be read

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts src/lab_test/branch.coverage.70.utilities.logic.test.ts src/lab_test/branch.coverage.100.phase29.cli-utils-status.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts src/lab_test/lts.trust.building.plan.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/ImportResolver.ts --runTestsByPath src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts src/lab_test/branch.coverage.70.utilities.logic.test.ts src/lab_test/branch.coverage.100.phase29.cli-utils-status.logic.test.ts src/lab_test/package.surface.logic.test.ts`
- `npm.cmd run typecheck`
