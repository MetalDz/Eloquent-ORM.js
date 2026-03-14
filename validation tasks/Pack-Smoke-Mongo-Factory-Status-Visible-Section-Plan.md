# Pack Smoke Mongo Factory Status Visible Section Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep `test:pack-smoke` stable when `factory:status --mongo` prints both the visible registry table and later incompatibility warnings.

## Scope
- Separate the visible factory-status section from post-table loader warnings in `scripts/pack-smoke.js`.
- Assert that Mongo-only factory status excludes SQL factories from the visible table while still allowing explicit skip warnings.
- Lock the behavior with a dedicated script-contract test.

## Implemented
- Added `factoryStatusVisibleSection(...)` in `scripts/pack-smoke.js`.
- Switched the Mongo factory-status assertion to inspect the visible table section only.
- Added an explicit assertion for the `Skipping incompatible factory for mongo: UserFactory` warning.

## Acceptance Criteria
- `GeoLocationFactory` is required in the visible Mongo factory-status output.
- `UserFactory` is excluded from the visible Mongo factory-status table.
- Skip warnings mentioning incompatible SQL factories do not fail `test:pack-smoke`.
