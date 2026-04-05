# PG Defaults, Migration Ordering, And CLI Version Plan

Status: COMPLETED

## Goal
- Keep generated PostgreSQL DDL clean for documented ORM contracts.
- Keep create migrations dependency-safe when models declare foreign keys in `static database`.
- Keep the shipped CLI version aligned with the published package version and SemVer policy.

## Locked Fixes
- PostgreSQL boolean defaults must emit `TRUE` / `FALSE`, not `1` / `0`.
- `make:migration --all` must order brand-new create migrations by dependencies declared in:
  - `static schema` `belongsTo`
  - `static database.foreignKeys`
- CLI banner version text must be resolved from `package.json`, not hardcoded.

## Versioning Rule
- CLI behavior is part of the public package contract.
- CLI-only fixes are `patch` when backward-compatible.
- New backward-compatible CLI features or flags are `minor`.
- Breaking CLI command or flag changes are `major`.

## Files
- `src/core/schema/SchemaBuilder.ts`
- `src/cli/commands/makeMigration.ts`
- `src/cli/utils/CliVersion.ts`
- `src/cli/utils/CliPresentation.ts`
- `src/documentation/versioning-policy.md`
- `docs/support/versioning-policy.mdx`
