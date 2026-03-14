# ORM Hardening Phase 5: Package Dist Whitelist Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep packaged release artifacts aligned with the built CLI/runtime surface by publishing the `dist` root explicitly.

## Scope
- Fix the package publish whitelist so root `dist` entry files are present in the tarball.
- Lock the package-surface expectation with a dedicated test.
- Revalidate packaged smoke after the whitelist change.

## Implemented
- Changed the publish whitelist in `package.json` from a nested `dist/**/*` glob to the explicit `dist` directory entry.
- Added an explicit `.npmignore` so package publishing no longer inherits the repo-level `dist` ignore from `.gitignore`.
- Added a dedicated package-surface test for the `dist` root whitelist.

## Acceptance Criteria
- The tarball contains `package/dist/index.js`.
- The tarball contains `package/dist/cli/eloquent.js`.
- Package-surface tests lock the `dist` root whitelist explicitly.
