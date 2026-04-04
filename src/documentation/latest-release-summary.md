# Latest Release Summary / v1.1.0

Last updated: 2026-04-04

## Goal
- Give consumers one stable official-docs URL for the latest release headline and the exact current package changes.

## Current release version
- Current package version: `1.1.0`

## What's New
<!-- latest-package-headline:start -->
- Fix release. Migration helpers now use descriptive pivot and table-scoped index filenames instead of a generic `create_pivot_table` fallback.
<!-- latest-package-headline:end -->

## Exact Changes
<!-- latest-package-update:start -->
- Keep the relational DDL and safe-diff model contract from `1.1.0`, fix migration helper generation so real `belongsToMany` pivots emit descriptive `create_<pivotTable>_table` files, group relational index helpers into table-scoped `add_<table>_indexes` migrations instead of a generic `create_pivot_table` fallback, and preserve the clean NodeNext source-tree, CommonJS `dist/*` build, and `100%` coverage baseline.
<!-- latest-package-update:end -->

## References
- [Release history](./release-history.md)
- [Release cadence](./release-cadence.md)
- [Repository summary source](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/PACKAGE-UPDATE-SUMMARY.md)
