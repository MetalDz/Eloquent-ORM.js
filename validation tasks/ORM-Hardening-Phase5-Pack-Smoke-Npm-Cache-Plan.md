# ORM Hardening Phase 5: Pack Smoke npm Cache Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep `scripts/pack-smoke.js` deterministic on local Windows hosts by isolating npm cache usage inside the repo workspace.

## Scope
- Force `runNpm(...)` calls in `pack-smoke` to use a local cache directory.
- Clean up that local cache directory after the smoke flow finishes.
- Lock the behavior with a dedicated script-contract test.

## Implemented
- Added `.npm-pack-smoke-cache` as the script-local cache directory.
- Added Windows-aware npm invocation so `pack-smoke` uses `cmd.exe /d /s /c npm.cmd ...` on Windows hosts.
- Updated `runNpm(...)` to pass both `npm_config_cache` and `NPM_CONFIG_CACHE`.
- Added final cleanup for the local npm cache directory.

## Acceptance Criteria
- `pack-smoke` does not depend on the user-global npm cache path.
- `pack-smoke` cleans up its temporary npm cache directory.
- The script contract test pins the local-cache behavior.
