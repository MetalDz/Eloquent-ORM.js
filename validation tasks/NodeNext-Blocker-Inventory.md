# NodeNext Blocker Inventory

Status: GENERATED SNAPSHOT

Snapshot date: `2026-04-10`

## Scope
- package: `@alpha.consultings/eloquent-orm.js`
- source roots scanned: `src`, `bin`
- template roots scanned: `src/cli`, `src/cli/templates`

## Direct source migration surface
- local relative import/require matches in `src` and `bin`: `1376`
- unique TypeScript files affected: `324`
- runtime-qualified import/export local specifiers: `1033`
- runtime-qualified dynamic local specifiers: `213`
- local require() calls: `130`

## Direct source hotspot breakdown
- `src/lab_test`: `228 files / 1030 matches`
- `src/cli`: `50 files / 213 matches`
- `src/core`: `42 files / 119 matches`
- `other`: `3 files / 13 matches`
- `bin`: `1 files / 1 matches`

## Generator and template emission blockers
- relative import/require string matches in generator sources and templates: `214`
- unique generator/template files affected: `50`
- `src/cli/commands`: `20 files / 118 matches`
- `src/cli/utils`: `29 files / 84 matches`
- `src/cli/other`: `1 files / 12 matches`

## Test assertion blockers
- exact import-string hotspot matches in `src/lab_test`: `19`
- unique test files affected: `8`
- `src/lab_test/orm.hardening.phase3.generated-app-test-model-stack.logic.test.ts`: `8 matches`
- `src/lab_test/orm.hardening.phase1.cli-action-runtime.logic.test.ts`: `3 matches`
- `src/lab_test/orm.hardening.phase1.cli-command-targets.logic.test.ts`: `3 matches`
- `src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts`: `1 matches`
- `src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts`: `1 matches`
- `src/lab_test/orm.hardening.phase1.cli-bootstrap.logic.test.ts`: `1 matches`
- `src/lab_test/orm.hardening.phase1.cli-production-guards.logic.test.ts`: `1 matches`
- `src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts`: `1 matches`

## Runtime loader hotspots
- `src/cli/utils/typescript/tsRuntime.ts` (exists): Consumer TypeScript loader must keep supporting NodeNext-style local `.js` specifiers.
- `src/cli/utils/ImportResolver.ts` (exists): Generator import paths must switch to NodeNext-safe emitted specifiers.
- `src/cli/utils/PathMap.ts` (exists): Generated artifacts and templates depend on path routing staying coherent during the migration.
- `src/cli/commands/makeModel.ts` (exists): Model scaffolding controls emitted local imports for generated models.
- `src/cli/commands/makeFactory.ts` (exists): Factory scaffolding emits local model imports and package imports that must stay dual-compatible.
- `src/cli/commands/makeRegistry.ts` (exists): Registry generation must keep working for NodeNext source trees and compiled consumers.
- `src/cli/commands/makeScenario.ts` (exists): Scenario generation emits a large graph of related files and import strings.
- `src/cli/commands/makeMigration.ts` (exists): Migration generation loads TypeScript models directly and must keep honoring NodeNext consumer code.

## Top direct-source files
- `src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts`: `39 matches`
- `src/core/model/BaseModel.ts`: `24 matches`
- `src/lab_test/nosql.cli.phase3.parity.logic.test.ts`: `23 matches`
- `src/lab_test/branch.coverage.70.cli-commands.logic.test.ts`: `21 matches`
- `src/lab_test/branch.coverage.100.phase35.core-utilities.logic.test.ts`: `19 matches`
- `src/lab_test/transaction.manager.logic.test.ts`: `19 matches`
- `src/lab_test/branch.coverage.100.phase5.logic.test.ts`: `16 matches`
- `src/lab_test/branch.coverage.70.orm-mixins.logic.test.ts`: `16 matches`
- `src/lab_test/branch.coverage.70.utilities.logic.test.ts`: `16 matches`
- `src/lab_test/branch.coverage.100.phase33.relations-tsruntime.logic.test.ts`: `15 matches`
- `src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts`: `15 matches`
- `src/lab_test/lts.phase5.residual-helper-mixin-coverage.logic.test.ts`: `15 matches`
- `src/lab_test/branch.coverage.100.phase2.logic.test.ts`: `14 matches`
- `src/lab_test/branch.coverage.100.phase32.cache-query-morph-redactor.logic.test.ts`: `14 matches`
- `src/lab_test/db.seed.connection.env.logic.test.ts`: `14 matches`

## What this inventory is for
- separate direct source imports from generator/template emitters
- distinguish already-runtime-qualified `.js`/`.mjs`/`.cjs`/`.json` local specifiers from unresolved extensionless ones
- separate test assertion churn from runtime code churn
- identify the NodeNext migration hotspots before touching `tsconfig` or mass-rewriting imports
