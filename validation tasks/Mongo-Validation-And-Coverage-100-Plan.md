# Mongo Validation And Coverage 100 Plan

Last updated: 2026-03-10

## Goal
- Confirm Mongo runtime uses the same model validation contract as SQL runtime.
- Continue raising automated test coverage toward 100%.

## What Was Added In This Step
- [x] Added focused Mongo validation runtime test:
  - `src/lab_test/nosql.mongodb.validation.logic.test.ts`
- [x] Added focused factory command coverage test:
  - `src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts`

## Mongo Validation Checks Covered
- [x] `create()` rejects invalid Mongo payloads before DB write.
- [x] `update()` uses partial validation (only provided fields).
- [x] `_id` and `id/_id` fallback filters are validated through Mongo update path.
- [x] `ELOQUENT_DISABLE_MODEL_HOOKS=true` disables validation hooks but does not disable validation rules.
- [x] Mongo path confirms no SQL adapter dependency for these flows.

## Coverage Progress In This Step
- `makeFactory.ts` (targeted coverage run):
  - Statements: `93.1%`
  - Branches: `75%`
  - Functions: `100%`
  - Lines: `94.04%`

## Next High-Impact Coverage Targets
- [ ] `MongoMigrationTracker.ts`
- [ ] `demoScenario.ts`
- [ ] `migrateRun.ts`
- [ ] `migrateRollback.ts`
- [ ] `makeScenario.ts`
- [ ] `makeController.ts`
- [ ] `makeService.ts`
- [ ] `ModelIntrospector.ts`
- [ ] `fileWriter.ts`

## Validation Commands Used
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/nosql.mongodb.validation.logic.test.ts`
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts`
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts src/lab_test/nosql.mongodb.validation.logic.test.ts`
- `npm.cmd run typecheck`

## Note
- Full `npm run test:coverage` in this environment still fails in MySQL-dependent integration suites due unavailable MySQL connection, so global 100% cannot be verified locally from this machine state.
