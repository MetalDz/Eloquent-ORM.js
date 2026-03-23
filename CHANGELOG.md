# 1.0.0 (2026-03-23)


### Bug Fixes

* minor ([500edb3](https://github.com/MetalDz/Eloquent-ORM.js/commit/500edb3d834cbef454423eadc01c408efbc0daa1))
* minor ([bba6fd9](https://github.com/MetalDz/Eloquent-ORM.js/commit/bba6fd93a5a2c5166aba9abac3751586a68ef63d))


### Features

* **cli,api:** add model registry generator and clean up model exports ([d51da62](https://github.com/MetalDz/Eloquent-ORM.js/commit/d51da629b1d31a2930c048a15526f7187360bc31))

# Changelog

## Unreleased

### Factory createMany concurrency hardening

- `Factory.createMany(count, callback, concurrency > 1)` now rejects on the first worker or callback failure.
- Concurrent `createMany` no longer resolves with sparse/partial success arrays when one task fails.

### Consumer migration note

- If your code relied on partial success in concurrent mode, switch to an explicit best-effort flow:
  - run per-item creation with `Promise.allSettled(...)`, or
  - run sequentially and handle per-item errors manually.

### makeModel update rollback safety

- `make:model --with-migration` now writes non-destructive `down()` SQL for generated `update_*` migrations.
- Update migrations now use `SchemaBuilder` inverse rollback SQL instead of unconditional `DROP TABLE`.
- When inverse rollback SQL is unavailable, generated `down()` emits a no-op rollback comment instead of dropping the table.

### migrateRun empty-detection robustness

- `migrate:run` no longer relies on brittle migration file source-text regex to detect empty migrations.
- Empty detection is now based on actual non-empty `db.query(...)` calls executed during `up()`.
- Valid migrations that use variable SQL or non-template query forms are no longer skipped as false-empty.

### ConnectionFactory cold-start race protection

- `getConnection()` now deduplicates concurrent cold-start initialization per connection name using in-flight promises.
- `getAdapter()` now deduplicates concurrent cold-start adapter initialization per connection name.
- Failed initialization now clears in-flight state so retries can succeed cleanly.

### SchemaBuilder default-string escaping hardening

- `SchemaBuilder.columnSQL()` now uses safe default-literal formatting for `options.default`.
- String defaults with single quotes are escaped (`'` -> `''`) in generated SQL.
- Applies consistently to create SQL and smart-update add-column SQL generation.

## Pre-release Notes

### Breaking package-surface changes in `0.9.x`

- Root exports were narrowed to the supported public API in [src/index.ts](/src/index.ts).
- Deep imports into internal paths such as `eloquent-orm.js/dist/core/*`, `eloquent-orm.js/dist/cli/*`, or repo source paths are private and unsupported.
- Internal connection helpers and config objects are no longer part of the root package surface.
  - Removed from public root usage: `getConnection`, `getAdapter`, `closeAllConnections`, `resolveConnectionName`, `DriverAdapter`, `dbConfig`, and cache internals.
- Generated consumer code now imports from `eloquent-orm.js` package root instead of internal relative source paths.

### Consumer action

- Update app imports to use only documented root exports from `eloquent-orm.js`.
- Regenerate CLI-created models/factories/scenarios if they were produced before the package-surface hardening work.
