# NoSQL (Mongo) Usage Guide

Last updated: 2026-03-10

## Scope
- Driver family: `mongo`
- Runtime targets:
  - app: `mongo`
  - test: `mongo_test`

## Environment Contract
Set mongo runtime and test values in `.env`:
- `MONGO_URI`
- `MONGO_DB_NAME`
- `MONGO_TEST_URI`
- `MONGO_TEST_DB_NAME`

Connection selection behavior:
- default connection from `DB_CONNECTION`
- explicit CLI target with `--mongo`
- explicit test target with `--mongo --test`

## CLI Targeting Rules
- `--mongo` maps to mongo connection in runtime mode.
- `--mongo --test` maps to `mongo_test` when configured.
- `--all-connections` stays SQL-only by contract (`mysql`, `pg`, `sqlite`).

## Runtime Model Contract
- Use `MongoModel` for document-model classes.
- `MongoModel` accepts explicit mongo connection names (`mongo`, `mongo_test`).
- `MongoModel` rejects non-mongo connection names early.

Primary key resolution on Mongo paths:
- `_id` mode: uses `_id`.
- `id` mode: uses fallback filter (`id` OR `_id`).
- custom PK mode: uses declared key directly.

## Command Compatibility Matrix

### Supported
- `make:model --mongo` (app) and `make:model --test --mongo` (test).
- `make:migration` for mongo targets (`--mongo`, `--mongo --test`).
- `migrate:status` for mongo targets.
- `migrate:run` for mongo targets.
- `migrate:rollback` for mongo targets.
- `migrate:fresh` for mongo targets.
- `migrate:reset` for mongo targets.
- `db:seed` with explicit mongo target.
- `db:seed:fresh` with explicit mongo target.
- `db:seed:precheck` mongo connectivity/bootstrap checks.
- `demo:scenario` mongo document workflow path.
- `make:scenario --test --mongo` with mongo-targeted generated model/migration/run routing.

### Partial
- `make:scenario` remains test-only by contract (`--test` required).
- Mixed SQL + NoSQL workflows are deterministic, but automatic cross-driver parity is not implied.
- Mongo migration execution requires reachable mongo runtime (`MONGO_URI` / `MONGO_TEST_URI`).
- `test:pack-smoke` keeps live mongo migrate checks optional unless `ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1`.

### Unsupported (by design)
- SQL adapter API surface on mongo (`getAdapter("mongo")`, SQL query paths).

## Recommended Mongo Flow
1. Validate connectivity/bootstrap:
   - `eloquent db:seed:precheck --mongo`
   - `eloquent db:seed:precheck --mongo --test`
2. Seed:
   - `eloquent db:seed --mongo --class <Seeder>`
   - `eloquent db:seed --mongo --test --class <Seeder>`
3. Validate scenario:
   - `eloquent demo:scenario`
   - `eloquent demo:scenario --test`

## Release Safety Checks
- `nosql-regression` CI gate validates NoSQL contract and parity suites.
- `test:pack-smoke` includes explicit `--mongo` runtime wiring checks for packaged CLI.
