# Public MongoModel And Scenario Seed Parity Plan

## Goal
Keep the public `MongoModel` API aligned with `BaseModel` behavior and ensure generated Mongo scenario seeders use Mongo-safe `id/_id` and morph alias helpers.

## Scope
- Export a `MongoModel` class from the public package entry that extends `BaseModel`.
- Preserve typed Mongo `getDB()` access and mongo-only connection guards.
- Ensure generated scenario seeders:
  - resolve IDs through `id` or `_id`
  - use class-level `getMorphClass()` fallback before constructor-name fallback
  - attach pivot rows with Mongo-safe IDs

## Acceptance
- `MongoModel` imported from the package entry has `getMorphClass`, `save`, `with`, and `toJSON`.
- `make:scenario --mongo` emits `idOf(...)` helper usage in generated seeders.
- Focused tests, typecheck, build, and live Mongo smoke pass.
