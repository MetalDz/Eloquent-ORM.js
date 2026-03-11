# Mongo Seed Test Mode Plan

Last updated: 2026-03-11  
Status: DONE

## Goal
- Cover the explicit `db:seed --mongo --test` workflow as a first-class CLI/runtime path.

## Scope
- Tarball smoke command surface
- Live mongo runtime seeding gate
- Post-seed verification against the target mongo test database

## Completion
- Extended `scripts/pack-smoke.js` to run `db:seed --test --mongo --class GeoLocationSeeder`.
- Added a live verification script that checks seeded `geolocations` documents in mongo.
- Added a focused logic test to lock the smoke contract.
