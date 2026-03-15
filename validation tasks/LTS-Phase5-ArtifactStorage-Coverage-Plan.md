# LTS Phase 5 ArtifactStorage Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/ArtifactStorage.ts`.

## Scope
- `src/cli/utils/ArtifactStorage.ts`
- `src/lab_test/lts.phase5.artifact-storage-coverage.logic.test.ts`

## Targeted Gap
- direct-path and extension-fallback resolution in `resolveExistingPath(...)`
- file-read fallback paths in `readFileContent(...)` and import collection helpers
- constructor and loader fallback branches for model/factory storage detection
- missing-file and empty-import handling for factory and seeder artifact routing

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - ctor-based SQL/Mongo/unknown detection
  - exact-path vs extension-path resolution
  - static file-content detection and `loadModule(...)` fallback
  - missing/unreadable model and factory dependency handling
  - empty imported-model / imported-factory entries being skipped safely
  - seeder storage-kind fallback for missing or empty imports

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.artifact-storage-coverage.logic.test.ts src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts src/lab_test/nosql.phase19.mixed-seeder-filtering.logic.test.ts src/lab_test/nosql.phase17.scenario-artifact-cache-reset.logic.test.ts src/lab_test/branch.coverage.100.phase20.dbseed.logic.test.ts src/lab_test/branch.coverage.100.phase5.logic.test.ts src/lab_test/db.seed.connection.env.logic.test.ts src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts src/lab_test/orm.hardening.phase2.incompatible-artifact-routing.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts src/lab_test/lts.trust.building.plan.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/ArtifactStorage.ts --runTestsByPath src/lab_test/lts.phase5.artifact-storage-coverage.logic.test.ts src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts src/lab_test/nosql.phase19.mixed-seeder-filtering.logic.test.ts src/lab_test/nosql.phase17.scenario-artifact-cache-reset.logic.test.ts src/lab_test/branch.coverage.100.phase20.dbseed.logic.test.ts src/lab_test/branch.coverage.100.phase5.logic.test.ts src/lab_test/db.seed.connection.env.logic.test.ts src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts src/lab_test/orm.hardening.phase2.incompatible-artifact-routing.logic.test.ts`
- `npm.cmd run typecheck`
