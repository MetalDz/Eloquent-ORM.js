## [1.0.9](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.8...v1.0.9) (2026-03-28)


### Bug Fixes

* add esm-safe package entry and document nodenext imports ([ccf1105](https://github.com/MetalDz/Eloquent-ORM.js/commit/ccf11057385d0ad00530ad41ba34b41f575fae02))
* patch dist cjs factory export after build ([2499e1a](https://github.com/MetalDz/Eloquent-ORM.js/commit/2499e1a08bc47835d59668a02e3cf6baa6b284d2))

## [1.0.8](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.7...v1.0.8) (2026-03-28)


### Bug Fixes

* sync new release block format with v1.0.7 metadata ([0472869](https://github.com/MetalDz/Eloquent-ORM.js/commit/04728693cf84f04ce1749555a64ce9706f9499d3))

## [1.0.7](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.6...v1.0.7) (2026-03-28)


### Bug Fixes

* document release behavior for docs commits ([c48eb42](https://github.com/MetalDz/Eloquent-ORM.js/commit/c48eb42ca2eb1628eda4b1ee13122a7bdae0c4fa))

## [1.0.6](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.5...v1.0.6) (2026-03-28)

## [1.0.5](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.4...v1.0.5) (2026-03-28)


### Bug Fixes

* emit ESM-safe make:registry imports for NodeNext apps, SoftDeletesMixin schema-detection hardening, restored 100% Docker coverage, and passing Docker pack smoke ([37362ad](https://github.com/MetalDz/Eloquent-ORM.js/commit/37362ad9f61fdb9a9a20d0c992bb3aafb5a84782))

## [1.0.4](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.3...v1.0.4) (2026-03-25)


### Bug Fixes

* add real sql rest scenario matrix and correct serialization delete runtime ([194dc23](https://github.com/MetalDz/Eloquent-ORM.js/commit/194dc235d5b9ccd7f8a930ce7f9c6683d718a336))
* reduce inactive tooling deps and harden security transparency ([72d591d](https://github.com/MetalDz/Eloquent-ORM.js/commit/72d591dc8fec12648f3844595c41e8c34fa2983a))

## [1.0.3](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.2...v1.0.3) (2026-03-24)


### Bug Fixes

* & improve npm package discovery metadata ([8760ffb](https://github.com/MetalDz/Eloquent-ORM.js/commit/8760ffb297bd69cb71c560738e24549145fd79d6))

## [1.0.2](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.1...v1.0.2) (2026-03-24)


### Bug Fixes

* finalize publish metadata, docs discovery, and package trim ([2bfff0e](https://github.com/MetalDz/Eloquent-ORM.js/commit/2bfff0e9b266fc4c96b8efce7f13c217ea663db0))

## [1.0.1](https://github.com/MetalDz/Eloquent-ORM.js/compare/v1.0.0...v1.0.1) (2026-03-23)


### Bug Fixes

* align scoped package publish surface ([9b37348](https://github.com/MetalDz/Eloquent-ORM.js/commit/9b373489534325358d7c47b19cbe283687a51f48))

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
- Deep imports into internal paths such as `@alpha.consultings/eloquent-orm.js/dist/core/*`, `@alpha.consultings/eloquent-orm.js/dist/cli/*`, or repo source paths are private and unsupported.
- Internal connection helpers and config objects are no longer part of the root package surface.
  - Removed from public root usage: `getConnection`, `getAdapter`, `closeAllConnections`, `resolveConnectionName`, `DriverAdapter`, `dbConfig`, and cache internals.
- Generated consumer code now imports from `@alpha.consultings/eloquent-orm.js` package root instead of internal relative source paths.

### Consumer action

- Update app imports to use only documented root exports from `@alpha.consultings/eloquent-orm.js`.
- Regenerate CLI-created models/factories/scenarios if they were produced before the package-surface hardening work.
