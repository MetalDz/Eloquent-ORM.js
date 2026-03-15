# Migration Append-Only And Dialect Fallback Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Stabilize the two post-coverage failures in the migration/schema area:
  - duplicate SQL CREATE migration generation when a baseline CREATE file already exists
  - stale unsupported-dialect assertion in the ASCII normalization suite

## Scope
- `src/cli/commands/makeMigration.ts`
- `src/lab_test/make.migration.append.only.logic.test.ts`
- `src/lab_test/migration.schema.ascii-normalization.logic.test.ts`
- `src/lab_test/migration.append-only-and-dialect-fallback.logic.test.ts`

## Delivered
- Restored the append-only SQL contract in `makeMigration(...)`:
  - baseline CREATE migrations are generated once
  - later passes do not emit a second CREATE file for the same table
- Refreshed the schema normalization assertion so it exercises the real unsupported-dialect path:
  - unsupported default dialect
  - unresolved connection alias

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/make.migration.append.only.logic.test.ts src/lab_test/migration.schema.ascii-normalization.logic.test.ts src/lab_test/migration.append-only-and-dialect-fallback.logic.test.ts`
- `npm.cmd run typecheck`
