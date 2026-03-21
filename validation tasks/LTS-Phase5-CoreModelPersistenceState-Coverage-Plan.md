# LTS Phase 5 CoreModelPersistenceState Coverage Plan

Status: COMPLETED

## Goal

Raise real source coverage for `src/core/model/CoreModelPersistenceState.ts` to 100% under the Docker `v8` coverage provider without excluding files or lowering thresholds.

## Exact target paths

- `buildMongoPrimaryFilter()` custom-key return path
- `getOriginalPrimaryKeyValue()` `_id <- id` fallback branch
- `getOriginalPrimaryKeyValue()` `id <- _id` fallback branch

## Validation artifact

- `src/lab_test/lts.phase5.coremodel-persistence-state-coverage.logic.test.ts`

## Rules

- add only source-targeted tests
- do not change the denominator
- do not mark complete until the focused Docker `v8` report shows 100% for `CoreModelPersistenceState.ts`
