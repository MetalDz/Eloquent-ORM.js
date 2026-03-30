# Latest Release Summary / v1.0.10

Last updated: 2026-03-29

## Goal
- Give consumers one stable official-docs URL for the latest release headline and the exact current package changes.

## Current release version
- Current package version: `1.0.10`

## What's New
<!-- latest-package-headline:start -->
- Patched. Root ESM imports no longer touch Factory eagerly, preserving CommonJS and NodeNext compatibility.
<!-- latest-package-headline:end -->

## Exact Changes
<!-- latest-package-update:start -->
- Fix the published root ESM surface so non-factory root imports no longer trigger the factory runtime, preserving CommonJS consumers and stabilizing NodeNext/Jest ESM usage.
<!-- latest-package-update:end -->

## References
- [Release history](./release-history.md)
- [Release cadence](./release-cadence.md)
- [Repository summary source](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/PACKAGE-UPDATE-SUMMARY.md)
