# Latest Release Summary / v1.0.11

Last updated: 2026-04-04

## Goal
- Give consumers one stable official-docs URL for the latest release headline and the exact current package changes.

## Current release version
- Current package version: `1.0.11`

## What's New
<!-- latest-package-headline:start -->
- Minor release. The ORM now supports model-declared relational DDL metadata and safe PostgreSQL smart-update diffs that preserve unmanaged foreign keys.
<!-- latest-package-headline:end -->

## Exact Changes
<!-- latest-package-update:start -->
- Add first-class model `database` metadata for foreign keys and indexes, emit relational DDL from the model source of truth, preserve unmanaged PostgreSQL foreign keys during smart-update diffs, keep the source-tree TypeScript contract on NodeNext while `dist/*` stays CommonJS, and restore `100%` statement, branch, function, and line coverage.
<!-- latest-package-update:end -->

## References
- [Release history](./release-history.md)
- [Release cadence](./release-cadence.md)
- [Repository summary source](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/PACKAGE-UPDATE-SUMMARY.md)
