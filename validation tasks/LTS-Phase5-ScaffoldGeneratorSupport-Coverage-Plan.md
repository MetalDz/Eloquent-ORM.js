# LTS Phase 5 ScaffoldGeneratorSupport Coverage Plan

Last updated: 2026-03-16 11:15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/ScaffoldGeneratorSupport.ts`.

## Scope
- `src/cli/utils/ScaffoldGeneratorSupport.ts`
- `src/lab_test/lts.phase5.scaffold-generator-support-coverage.logic.test.ts`

## Targeted Gap
- nullish scaffold model-name normalization through `modelName ?? ""`
- suffix-only scaffold names where the stripped base would become empty and must fall back to the trimmed original value

## Completion Notes
- No runtime refactor was needed.
- Added focused regression coverage proving:
  - undefined model names normalize safely to an empty string
  - suffix-only names like `Controller` and `Service` keep the trimmed original string instead of collapsing to an empty class base

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.scaffold-generator-support-coverage.logic.test.ts src/lab_test/orm.hardening.phase5.scaffold-generators.logic.test.ts src/lab_test/orm.hardening.phase5.scaffold-suffix-normalization.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/ScaffoldGeneratorSupport.ts --runTestsByPath src/lab_test/lts.phase5.scaffold-generator-support-coverage.logic.test.ts src/lab_test/orm.hardening.phase5.scaffold-generators.logic.test.ts src/lab_test/orm.hardening.phase5.scaffold-suffix-normalization.logic.test.ts`
- `npm.cmd run typecheck`
