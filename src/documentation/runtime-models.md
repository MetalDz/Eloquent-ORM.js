# Runtime Models

Last updated: 2026-03-19

## SQL models

Use SQL models when you want migrations, relational integrity, and pivot-backed workflows.

- MySQL: conventional production web-app default
- PostgreSQL: stricter relational workloads and richer SQL semantics
- SQLite: local development, lightweight apps, and test isolation

## Mongo models

Use Mongo models when the workload is document-first and explicit `--mongo` flows are part of the runtime story.

Avoid SQL-only assumptions such as foreign-key and pivot-table guarantees.

## Relations

Common runtime relation types:

- `belongsTo`
- `hasOne`
- `hasMany`
- `belongsToMany`
- `morphOne`
- `morphMany`
- `morphTo`
