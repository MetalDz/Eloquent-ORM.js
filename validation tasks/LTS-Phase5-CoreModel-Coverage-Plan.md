# LTS Phase 5 CoreModel Coverage Plan

Last updated: 2026-03-16 10:17  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/model/CoreModel.ts`.

## Scope
- `src/core/model/CoreModel.ts`
- `src/lab_test/lts.phase5.coremodel-coverage.logic.test.ts`

## Targeted Gap
- the static safe-finder facade wrappers that delegate through `CoreModelSafeFinderSupport`
- private assignable-field validation via `assertAssignableField(...)`
- `save()` branches for create returning `null` and persisted instances missing an original primary key
- `patch()` branches for persisted instances missing an original primary key and no-op primary-key-only payloads

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - `where`, `orderBy`, `limit`, `with`, `active`, `inactive`, `published`, `get`, `first`, `findBy`, `findOneBy`, `findAllBy`, and `existsBy` delegation through the extracted safe-finder helper layer
  - `assertAssignableField(...)` rejecting unknown persistence fields
  - `save()` returning cleanly when `create()` resolves `null`
  - `save()` and `patch()` rejecting persisted instances that do not have an original primary key snapshot
  - `patch()` skipping unchanged primary-key payloads without issuing an update

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.coremodel-coverage.logic.test.ts src/lab_test/coremodel.crud.logic.test.ts src/lab_test/branch.coverage.100.phase10.core-model.logic.test.ts src/lab_test/nosql.mongodb.validation.logic.test.ts src/lab_test/instance.persistence.layer.runtime.logic.test.ts src/lab_test/real.model.instance.persistence.integration.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-validation-events.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-persistence-state.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/model/CoreModel.ts --runTestsByPath src/lab_test/lts.phase5.coremodel-coverage.logic.test.ts src/lab_test/coremodel.crud.logic.test.ts src/lab_test/branch.coverage.100.phase10.core-model.logic.test.ts src/lab_test/nosql.mongodb.validation.logic.test.ts src/lab_test/instance.persistence.layer.runtime.logic.test.ts src/lab_test/real.model.instance.persistence.integration.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-validation-events.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-persistence-state.logic.test.ts src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts`
- `npm.cmd run typecheck`
