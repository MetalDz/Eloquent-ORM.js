# LTS Phase 5 BelongsToMany Coverage Plan

Last updated: 2026-03-16 09:16  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/orm/relations/BelongsToMany.ts`.

## Scope
- `src/core/orm/relations/BelongsToMany.ts`
- `src/lab_test/lts.phase5.belongs-to-many-coverage.logic.test.ts`

## Targeted Gaps
- Mongo `getResults(...)` early return when the parent has no comparable key values
- Mongo `getResults(...)` early return when pivot rows produce no related ids
- Mongo `match(...)` branches for:
  - skipped pivot rows with missing parent keys
  - empty related-id short-circuit without querying the related collection
  - default relation-name fallback
  - missing pivot-group fallback
  - duplicate related ids
  - missing related rows
  - `hydrateRow(...)` returning `null`
- Mongo `attach(...)` fallback from `insertOne(...)` to `insertMany(...)`
- Mongo `attach(...)` failure when no insert operation is supported
- Mongo `detach(...)` failure when `deleteMany(...)` is unavailable
- Mongo `sync(...)` failure when `deleteMany(...)` is unavailable
- Mongo `sync(...)` early return when `relatedIds` is empty
- Mongo `sync(...)` fallback to `attach(...)` when `insertMany(...)` is unavailable

## Completion Notes
- No runtime refactor was needed.
- Added focused Mongo relation coverage for the remaining edge branches without changing SQL behavior.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.belongs-to-many-coverage.logic.test.ts src/lab_test/relations.logic.test.ts src/lab_test/nosql.phase12.native-belongstomany.logic.test.ts src/lab_test/branch.coverage.100.phase2.logic.test.ts src/lab_test/branch.coverage.100.phase26.utilities-relations.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/orm/relations/BelongsToMany.ts --runTestsByPath src/lab_test/lts.phase5.belongs-to-many-coverage.logic.test.ts src/lab_test/relations.logic.test.ts src/lab_test/nosql.phase12.native-belongstomany.logic.test.ts src/lab_test/branch.coverage.100.phase2.logic.test.ts src/lab_test/branch.coverage.100.phase26.utilities-relations.logic.test.ts`
- `npm.cmd run typecheck`
