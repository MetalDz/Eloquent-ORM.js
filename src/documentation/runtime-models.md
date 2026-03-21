# Runtime Models

Last updated: 2026-03-19

## SQL models

Use SQL models when you want migrations, relational integrity, and pivot-backed workflows.

- MySQL: conventional production web-app default
- PostgreSQL: stricter relational workloads and richer SQL semantics
- SQLite: local development, lightweight apps, and test isolation

Choose SQL when constraints, pivot tables, and migration-backed integrity should be preferred over document flexibility.

### MySQL

- typical production web apps
- broad hosting availability
- conventional relational CRUD workloads

### PostgreSQL

- stricter relational workloads
- advanced SQL features and richer query semantics
- systems that prefer PostgreSQL-native operations

### SQLite

- local development
- lightweight apps
- test isolation and file-based workflows

## Mongo models

Use Mongo models when the workload is document-first and explicit `--mongo` flows are part of the runtime story.

Avoid SQL-only assumptions: Mongo has no SQL foreign-key guarantees or pivot-table guarantees.

- document-first workloads
- flexible shapes
- NoSQL scenario generation and explicit `--mongo` flows
- relation support depends on explicit model methods instead of SQL constraints

## Relations

Common runtime relation types:

- `belongsTo`
- `hasOne`
- `hasMany`
- `belongsToMany`
- `morphOne`
- `morphMany`
- `morphTo`

Use SQL when relation integrity and pivot-backed workflows are central.
Use Mongo when relation references are explicit and document-first behavior matters more than SQL-style guarantees.
