# Mongo Live CLI Integration

Last updated: 2026-03-11  
Status: COMPLETE

## Goal
- Prove that the built CLI can execute Mongo-only commands end to end against a live Mongo runtime, not just through mocked/unit flows or pack-smoke contracts.

## Scope
- `make:model --test --mongo --with-migration`
- `make:factory --test`
- `make:seed --test`
- `migrate:fresh --test --mongo`
- `db:seed --test --mongo`
- `factory:status --test --mongo`
- `demo:scenario --test --mongo`

## Completed
- [x] Added a dedicated built-CLI Mongo integration test:
  - `src/lab_test/cli.integration.mongo.targeting.test.ts`
- [x] The integration test uses:
  - a unique Mongo test database per run
  - a unique generated Mongo model (`GeoLocationCliMongo`)
  - existing SQL test factories as the mixed-artifact control
- [x] Verified Mongo-only factory filtering:
  - `GeoLocationCliMongoFactory` is visible
  - `UserFactory` is excluded under `--mongo`
- [x] Verified live Mongo migration + seed path:
  - `migrate:fresh --test --mongo`
  - `db:seed --test --mongo --class GeoLocationCliMongoSeeder`
- [x] Verified live Mongo demo path:
  - `demo:scenario --test --mongo --random`
  - zero blog collections is handled gracefully
  - SQL adapter error does not leak into Mongo runtime

## Validation
- targeted Jest integration run for the live Mongo CLI file
- `npm run typecheck`
- `npm run build`

## Notes
- The integration suite is env-gated by the presence of `MONGO_TEST_URI` or `MONGO_URI`.
- The test cleans up generated files and drops its unique Mongo test database after execution.
