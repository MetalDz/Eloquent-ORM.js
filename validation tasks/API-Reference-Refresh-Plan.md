# API Reference Refresh Plan

Status: COMPLETED

## Goal
Refresh `src/documentation/api-reference.md` so it clearly documents the current public root exports and the separate `eloquent-orm.js/Model` subpath contract.

## Delivered
- Updated the API reference last-updated stamp.
- Split the documentation into:
  - root package exports: `eloquent-orm.js`
  - model subpath exports: `eloquent-orm.js/Model`
- Documented that `eloquent-orm.js/Model` has named exports only.
- Documented that the Laravel-style `Model` alias stays on the root package.
- Added import examples for both entrypoints.
- Added the matching regression in `src/lab_test/api.reference.refresh.logic.test.ts`.
