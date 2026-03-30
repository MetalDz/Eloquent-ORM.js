# NodeNext Generator Template Rewrite Plan

Status: COMPLETED

## Goal

Make generator output NodeNext-safe for target projects that use ESM/NodeNext, while keeping current CommonJS consumer output stable.

## Locked behavior

- Relative imports emitted by generators gain `.js` only when the target project resolves as NodeNext/ESM.
- CommonJS target projects keep the existing extensionless relative imports.
- Public package imports remain package-name imports when generators run outside this repo.
- The source of truth for runtime suffixing is `ImportResolver`, not duplicated helper logic inside each generator.

## Files covered

- `src/cli/utils/ImportResolver.ts`
- `src/cli/commands/makeRegistry.ts`
- `src/cli/commands/makeModel.ts`
- `src/cli/commands/makeFactory.ts`
- `src/cli/commands/makeSeed.ts`
- `src/cli/commands/makeScenario.ts`
- `src/cli/templates/factory.tpl`
- `src/cli/templates/seed.tpl`

## Validation

- `src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts`
- `src/lab_test/make.registry.logic.test.ts`
- `src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts`
- `src/lab_test/nodenext.generator-template-rewrite.logic.test.ts`

## Notes

- This task does not flip the repo source tree to NodeNext yet.
- `dist/*` remains the CommonJS runtime surface.
- The rewrite is conditional on the target project metadata so existing CommonJS consumers are not broken.
