# Hot Fix Base Code - Model Docs Alignment

Last updated: 2026-03-21
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Freeze the model-documentation slice for the API hot fix so SQL and Mongo guidance moves with the updated CRUD/runtime contract.

## Scope

- keep SQL and Mongo model guidance clearly separated
- explain when to choose MySQL, PostgreSQL, SQLite, and Mongo
- keep relation-type coverage explicit:
  - `belongsTo`
  - `hasOne`
  - `hasMany`
  - `belongsToMany`
  - `morphOne`
  - `morphMany`
  - `morphTo`
- explain SQL integrity expectations versus Mongo caveats

## Acceptance Criteria

- runtime model docs explain SQL and Mongo as separate runtime choices
- SQL docs explain MySQL, PostgreSQL, and SQLite use cases
- Mongo docs explain document-first use, flexible shapes, and `--mongo` flows
- relation guidance includes all shipped relation types
- SQL docs state when constraints, pivot tables, and migration-backed integrity should be preferred
- Mongo docs state that foreign-key guarantees do not exist and relations depend on explicit model methods
