# ORM Hardening Phase 5: Pack Smoke Tarball Staging Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep `scripts/pack-smoke.js` stable on Windows hosts by avoiding repeated reads from the repo-root tarball after `npm pack`.

## Scope
- Stage the packed tarball into a dedicated temporary snapshot immediately after `npm pack`.
- Make every sample app copy from the staged snapshot instead of the repo-root `.tgz`.
- Clean up the staged tarball snapshot after the smoke flow finishes.
- Lock the behavior with a dedicated script-contract test.

## Implemented
- Added `stageTarballSnapshot(...)` in `pack-smoke`.
- Switched tarball listing to inspect the staged tarball snapshot.
- Switched all `createSampleApp(...)` calls to copy from the staged snapshot path.
- Added staged tarball directory cleanup in the script `finally` block.

## Acceptance Criteria
- `pack-smoke` no longer depends on the repo-root tarball remaining present across the whole smoke lifecycle.
- Later sample-app creation reuses the staged tarball snapshot safely.
- The tarball staging behavior is pinned by a dedicated test.
