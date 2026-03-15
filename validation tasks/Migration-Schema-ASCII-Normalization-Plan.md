# Migration and Schema ASCII Normalization Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Remove mojibake and unstable Unicode display markers from the migration-generation and schema-diff hotspot pair:
  - `src/cli/commands/makeMigration.ts`
  - `src/core/schema/SchemaBuilder.ts`

## Scope
- Runtime logs and thrown messages
- Generated migration header text
- Corrupted section comments inside the two source files

## Delivered
- Replaced corrupted runtime markers with plain ASCII text:
  - `ERROR:`
  - `WARN:`
  - `INFO:`
  - `OK:`
- Normalized migration generator messages such as:
  - `No new columns or schema changes - skipping.`
  - `Migration generation complete in ... mode.`
- Normalized generated migration headers to plain ASCII:
  - `Auto-generated CREATE migration ...`
  - `Auto-generated UPDATE migration ...`
- Normalized corrupted `SchemaBuilder` comments and error strings:
  - `SchemaBuilder v4.0`
  - `Smart Diff Logic (Add + Drop)`
  - `DROP TABLE`
  - `COLUMN BUILDER`
  - `RELATIONS`
  - `MIXINS`

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/migration.schema.ascii-normalization.logic.test.ts src/lab_test/branch.coverage.100.phase11.make-migration.logic.test.ts src/lab_test/branch.coverage.100.phase15.make-migration-extra.logic.test.ts src/lab_test/branch.coverage.100.phase25.schema-builder-invariants.logic.test.ts src/lab_test/branch.coverage.100.phase9.schema-builder.logic.test.ts`
- `npm.cmd run typecheck`
