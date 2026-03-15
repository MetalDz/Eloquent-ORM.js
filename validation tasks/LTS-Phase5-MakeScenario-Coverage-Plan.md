# LTS Phase 5 MakeScenario Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gaps in `src/cli/commands/makeScenario.ts`.

## Scope
- `src/cli/commands/makeScenario.ts`
- `src/lab_test/lts.phase5.make-scenario-coverage.logic.test.ts`

## Targeted Gaps
- invalid scenario manifest fallback
- random preset fallback when the requested preset is unknown
- existing model skip behavior when `--force` is not used
- mongo connection guard when no mongo target is resolved
- stale artifact cleanup and removed-artifact reporting
- preset-changed warning when generation replaces a previous scenario without `--run`
- controller/service generation loops in the current scenario pipeline
- generated seeder content that carries morph fallback and random-pick helpers

## Completion Notes
- Added a dedicated harness that isolates `makeScenario(...)` behind mocked CLI/runtime dependencies.
- Locked the invalid-manifest, preset fallback, cleanup, warning, and mongo-guard branches with focused regressions.
- Confirmed both SQL fallback routing and Mongo targeted routing through the scenario generator.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.make-scenario-coverage.logic.test.ts src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts src/lab_test/nosql.phase16.scenario-generator-type-parity.logic.test.ts src/lab_test/nosql.phase17.scenario-artifact-cache-reset.logic.test.ts src/lab_test/nosql.phase18.public-mongomodel-and-scenario-seed.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/orm.hardening.phase3.template-inline-model-parity.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeScenario.ts --runTestsByPath src/lab_test/lts.phase5.make-scenario-coverage.logic.test.ts src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts src/lab_test/nosql.phase16.scenario-generator-type-parity.logic.test.ts src/lab_test/nosql.phase17.scenario-artifact-cache-reset.logic.test.ts src/lab_test/nosql.phase18.public-mongomodel-and-scenario-seed.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/orm.hardening.phase3.template-inline-model-parity.logic.test.ts`
- `npm.cmd run typecheck`
