# Factory Display ASCII Normalization Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Normalize the factory display/runtime surface to plain ASCII so the code and output remain readable across Windows terminals, CI logs, packaged installs, and mixed editor encodings.

## Scope
- `src/cli/commands/factoryStatus.ts`
- `src/cli/utils/factories/FactoryGraph.ts`
- `src/cli/utils/factories/FactoryRegistry.ts`
- `src/cli/utils/factories/FactoryDisplay.ts`

## Delivered
- Replaced mojibake relation markers with shared ASCII markers:
  - `belongsTo` -> `<-`
  - `hasOne` -> `->`
  - `hasMany` -> `->>`
  - `belongsToMany` -> `<->`
  - `morph*` -> `~>`
- Replaced corrupted display markers and status banners with plain ASCII text.
- Centralized the display markers and shared footer/header text in `FactoryDisplay.ts`.
- Added a regression that locks both source cleanliness and runtime output cleanliness.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/factory.display.ascii-normalization.logic.test.ts src/lab_test/lts.phase5.factory-runtime-coverage.logic.test.ts src/lab_test/nosql.phase9.runtime-demo-factory-status.logic.test.ts`
- `npm.cmd run typecheck`
