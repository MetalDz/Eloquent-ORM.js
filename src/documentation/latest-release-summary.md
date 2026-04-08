# Latest Release Summary / v1.1.3

Last updated: 2026-04-04

## Goal
- Give consumers one stable official-docs URL for the latest release headline and the exact current package changes.

## Current release version
- Current package version: `1.1.3`

## What's New
<!-- latest-package-headline:start -->
- Fix release. PostgreSQL boolean defaults, dependency-safe create ordering, and CLI version reporting are now aligned with the package contract.
<!-- latest-package-headline:end -->

## Exact Changes
<!-- latest-package-update:start -->
- Keep the relational DDL and safe-diff model contract from `1.1.0`, emit PostgreSQL boolean defaults as `TRUE` / `FALSE` instead of `0` / `1`, order brand-new create migrations by dependencies declared in both `static schema` and `static database.foreignKeys`, resolve the shipped CLI banner version from `package.json` instead of the stale `v1.0` literal, and lock the CLI SemVer rule in the published versioning policy while preserving the clean NodeNext source-tree, CommonJS `dist/*` build, and `100%` coverage baseline.
<!-- latest-package-update:end -->

## References
- [Release history](./release-history.md)
- [Release cadence](./release-cadence.md)
- [Repository summary source](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/PACKAGE-UPDATE-SUMMARY.md)
