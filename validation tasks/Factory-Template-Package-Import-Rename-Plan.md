# Factory Template Package Import Rename Plan

Last updated: 2026-03-16 11:38  
Status: COMPLETED

## Goal
- Make factory and pivot-factory generation follow the current package import path instead of hardcoding the legacy package name.

## Scope
- `src/cli/commands/makeFactory.ts`
- `src/cli/templates/factory.tpl`
- `src/cli/templates/pivot-factory.tpl`
- `src/lab_test/make.factory.package-import-rename.logic.test.ts`

## Completion Notes
- `makeFactory(...)` now resolves the package import path through `ImportResolver.publicApiImportPath()`.
- Both factory templates now render `{{packageImportPath}}`.
- Generated main and pivot factories now stay aligned with package renames in installed-package flows.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/make.factory.package-import-rename.logic.test.ts src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts src/lab_test/milestone1.schema-and-template.logic.test.ts`
- `npm.cmd run test:pack-smoke`
- `npm.cmd run typecheck`
