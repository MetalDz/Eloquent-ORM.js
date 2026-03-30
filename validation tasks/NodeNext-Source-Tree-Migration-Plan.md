# NodeNext Source Tree Migration Plan

Status: LOCKED

## Goal
Move the source tree to `NodeNext` semantics without breaking the published package contract:
- source/typecheck/dev flows use NodeNext rules
- published `dist/*` remains the CommonJS runtime surface
- published `esm/*` remains the ESM / NodeNext consumer surface
- CommonJS consumers must keep working

## Public Contract That Must Not Break
- `require("@alpha.consultings/eloquent-orm.js")` must keep working
- `import { ... } from "@alpha.consultings/eloquent-orm.js"` must keep working
- the CLI entry must keep working from compiled JavaScript
- public root exports and subpath exports must keep their names

## What Will Change
- TypeScript source import specifiers across the repo
- root TypeScript config and build config split
- generator/template output that currently emits extensionless local imports
- tests that assert exact import strings
- CLI TypeScript runtime rules for NodeNext local `.js` specifiers

## What Should Not Change
- ORM business logic and SQL / Mongo behavior
- the published CommonJS `dist/*` contract
- the export-map shape for current consumers
- release severity, as long as the public contract stays compatible

## Migration Strategy
1. Lock the source-tree migration contract and blocker audit before changing configs.
2. Audit the repo for local relative specifiers and generator/template outputs that will break under NodeNext.
3. Split config responsibilities:
   - source/typecheck config follows `NodeNext`
   - build config still produces CommonJS `dist/*`
4. Update source imports and generated templates mechanically, not ad hoc.
5. Revalidate CLI TypeScript runtime loading for consumer NodeNext projects.
6. Re-run build, package-surface tests, and pack-smoke before release.

## Key Design Constraint
This is not an ESM-only migration.

The package must remain dual-compatible:
- CommonJS from `dist/*`
- ESM / NodeNext from `esm/*`

## Risk Areas
- `src/lab_test` has a large number of relative imports and exact-string expectations
- generators and templates can reintroduce non-NodeNext output if not updated together
- the CLI TypeScript runtime must continue resolving NodeNext-style local `.js` specifiers back to source files
- tests that rely on exact compiled/imported file names will need synchronized updates

## Expected Release Type
- `patch`, if CommonJS behavior and current public imports remain compatible
- not `major` unless the public package contract is broken

## Required Validation Before Implementation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/nodenext.source-tree-migration-plan.logic.test.ts src/lab_test/nodenext.blocker-audit.logic.test.ts`

## Required Validation Before Release
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/package.surface.logic.test.ts src/lab_test/package.root.lazy-factory.logic.test.ts src/lab_test/dual.package.cjs-esm.compatibility.logic.test.ts src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts`
- `npm.cmd run test:pack-smoke`
