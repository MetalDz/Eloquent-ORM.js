# Mongo Native Relations Phase 1 Plan

## Goal

Add native Mongo support for the first two core relation classes:

- `belongsTo`
- `hasMany`

This phase must also make eager loading work through the existing `with(...)` path for those two relations.

## Scope

- Support direct relation resolution with Mongo collection queries
- Support eager loading through `match(...)`
- Support `id` / `_id` fallback semantics like the rest of the Mongo model runtime

## Out Of Scope

- `hasOne`
- `belongsToMany` relation resolution
- morph relations
- SQL behavior changes

## Acceptance

- `BelongsTo.getResults()` works on Mongo
- `BelongsTo.match()` works on Mongo
- `HasMany.getResults()` works on Mongo
- `HasMany.match()` works on Mongo
- `new MongoParent().with("children").find(id)` works
- `new MongoChild().with("parent").find(id)` works
