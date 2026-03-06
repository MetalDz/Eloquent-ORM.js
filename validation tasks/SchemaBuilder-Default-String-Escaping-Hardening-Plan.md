# SchemaBuilder Default-String Escaping Hardening Plan

## Goal
Ensure string defaults are safely escaped in generated SQL so quotes inside default values do not break SQL generation.

## Problem Summary
`SchemaBuilder.columnSQL()` interpolated string defaults as `DEFAULT '${value}'` without escaping single quotes, producing invalid SQL for values like `O'Reilly`.

## Scope
- `src/core/schema/SchemaBuilder.ts`
- Dedicated tests for default-string escaping in create/update SQL generation

## Work Plan

### Phase 1: Reproduce and Lock with Tests
- [x] Add dedicated create-SQL escaping test across mysql/pg/sqlite.
- [x] Add dedicated update add-column escaping test.

### Phase 2: Implement Escaping Hardening
- [x] Route default literal generation through a safe formatter (`formatDefaultLiteral`).
- [x] Remove direct unescaped interpolation for `options.default`.

### Phase 3: Validation
- [x] Run targeted schema escaping tests.
- [x] Run `npm.cmd run typecheck`.
- [x] Run full `npm.cmd test`.

### Phase 4: Tracking and Notes
- [x] Update `Assumptions.md` status.
- [x] Add release note in `CHANGELOG.md`.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Escaping hardening implemented in `SchemaBuilder.columnSQL()`.
- `2026-03-06`: Dedicated regression test file added (`schema.default.string.escape.logic.test.ts`).
- `2026-03-06`: Targeted schema suites passed (`schema.default.string.escape`, `milestone1.schema-and-template`, `schema.relation.coverage`).
- `2026-03-06`: `npm.cmd run typecheck` passed.
- `2026-03-06`: Full suite passed (`29 passed`, `3 skipped` suites).

## Exit Criteria
- String defaults with single quotes generate valid escaped SQL.
- No unescaped default interpolation remains in `columnSQL`.
- Typecheck and full test suite pass.
