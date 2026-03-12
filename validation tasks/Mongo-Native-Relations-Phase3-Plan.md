# Mongo Native Relations Phase 3 Plan

## Goal

Add native Mongo support for `belongsToMany` relation resolution and eager loading.

## Scope

- Direct `belongsToMany` resolution on Mongo
- Eager loading through `with(...)`
- Relation-level `attach`, `detach`, and `sync` on Mongo
- Fix the relation contract so the parent local key defaults to `id`

## Out Of Scope

- morph relations
- query-builder changes

## Acceptance

- `new Post().tags().getResults(...)` works on Mongo
- `new Post().with("tags").find(id)` works on Mongo
- `BelongsToMany.attach/detach/sync` work on Mongo
- existing SQL relation tests pass under the corrected parent-key contract
