# Mongo Command Parity Plan

Last updated: 2026-03-11  
Status: DONE

## Goal
- Harden explicit `--mongo` command parity beyond the earlier routing tests.
- Cover the command combinations most likely to regress in real app/test usage.

## Scope
- `make:model --mongo --with-migration`
- `migrate:fresh --mongo --all-migrations`
- `migrate:reset --mongo`
- `scripts/pack-smoke.js` NoSQL command-surface checks

## Completion
- Added focused logic tests for mongo command delegation and migration regeneration.
- Extended pack smoke to scaffold a mongo model/factory/seeder before runtime checks.
- Extended live mongo smoke to include `migrate:fresh --mongo` and `migrate:reset --mongo`.
