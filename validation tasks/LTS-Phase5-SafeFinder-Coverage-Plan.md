# LTS Phase 5 SafeFinder Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/model/SafeFinder.ts`.

## Scope
- `src/core/model/SafeFinder.ts`
- `src/lab_test/lts.phase5.safe-finder-coverage.logic.test.ts`

## Targeted Gap
- status-column fallback branches for `active()`, `inactive()`, and `published()`
- unsupported-driver branches in `get()` and `first()`
- missing-schema rejection through `getSchema()`
- eager-loading rejection when the model exposes relations but does not implement `eagerLoadRelations(...)`
- Mongo `first()` sorting branch

## Completion Notes
- No runtime refactor was needed.
- Added focused regression coverage for:
  - status-column fallback scopes on SQL drivers
  - unsupported driver behavior in both read terminals
  - missing schema rejection
  - safe-finder eager-loading support requirements
  - sorted Mongo `first()` execution

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.safe-finder-coverage.logic.test.ts src/lab_test/safe.finder.api.runtime.logic.test.ts src/lab_test/orm.hardening.phase4.safe-finder-restrictions.logic.test.ts src/lab_test/orm.hardening.phase4.finder-eager-serialization.logic.test.ts src/lab_test/appsmoke.safe-finder.integration.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/model/SafeFinder.ts --runTestsByPath src/lab_test/lts.phase5.safe-finder-coverage.logic.test.ts src/lab_test/safe.finder.api.runtime.logic.test.ts src/lab_test/orm.hardening.phase4.safe-finder-restrictions.logic.test.ts src/lab_test/orm.hardening.phase4.finder-eager-serialization.logic.test.ts src/lab_test/appsmoke.safe-finder.integration.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts`
- `npm.cmd run typecheck`
