# Latest Release Summary / v1.0.11

Last updated: 2026-03-29

## Goal
- Give consumers one stable official-docs URL for the latest release headline and the exact current package changes.

## Current release version
- Current package version: `1.0.11`

## What's New
<!-- latest-package-headline:start -->
- Patched. The published ESM surface now builds from dedicated TypeScript entrypoints, keeping CommonJS stable and removing wrapper-generation drift.
<!-- latest-package-headline:end -->

## Exact Changes
<!-- latest-package-update:start -->
- Replace the generated ESM wrapper script with a true TypeScript ESM build pipeline, compiling dedicated `esm-src/*.mts` entrypoints into the published `esm/*` surface while preserving the CommonJS `dist/*` runtime contract.
<!-- latest-package-update:end -->

## References
- [Release history](./release-history.md)
- [Release cadence](./release-cadence.md)
- [Repository summary source](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/PACKAGE-UPDATE-SUMMARY.md)
