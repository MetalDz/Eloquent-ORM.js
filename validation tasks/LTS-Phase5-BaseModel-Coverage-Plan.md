# LTS Phase 5 BaseModel Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/model/BaseModel.ts`.

## Scope
- `src/core/model/BaseModel.ts`
- `src/lab_test/lts.phase5.basemodel-coverage.logic.test.ts`

## Targeted Gap
- the `MongoModel` constructor guard that rejects non-mongo connection names

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks both sides of the `MongoModel` connection contract:
  - valid mongo connection -> typed `getDB()` path
  - non-mongo connection -> constructor throws immediately

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.basemodel-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase28.base-model.logic.test.ts src/lab_test/orm.hardening.phase1.runtime.logic.test.ts src/lab_test/serialization.basemodel.runtime.logic.test.ts src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/model/BaseModel.ts --runTestsByPath src/lab_test/lts.phase5.basemodel-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase28.base-model.logic.test.ts src/lab_test/orm.hardening.phase1.runtime.logic.test.ts src/lab_test/serialization.basemodel.runtime.logic.test.ts src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `npm.cmd run typecheck`
