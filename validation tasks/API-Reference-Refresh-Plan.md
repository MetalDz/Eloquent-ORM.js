# API Reference Refresh Plan

Status: COMPLETED

## Goal
Refresh `src/documentation/api-reference.md` so it clearly documents the current public root exports and the separate `eloquentjs/Model` subpath contract.

## Delivered
- Updated the API reference last-updated stamp.
- Split the documentation into:
  - root package exports: `eloquentjs`
  - model subpath exports: `eloquentjs/Model`
- Documented that `eloquentjs/Model` has named exports only.
- Documented that the Laravel-style `Model` alias stays on the root package.
- Added import examples for both entrypoints.
- Added the matching regression in `src/lab_test/api.reference.refresh.logic.test.ts`.
