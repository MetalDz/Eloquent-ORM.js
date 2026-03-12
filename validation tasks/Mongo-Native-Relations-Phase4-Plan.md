# Mongo Native Relations Phase 4 Plan

## Goal

Add native Mongo support for morph relations:

- `morphTo`
- `morphOne`
- `morphMany`

## Scope

- direct relation resolution on Mongo
- eager loading through `with(...)`
- grouped `morphTo.match(...)` by morph type
- `id` / `_id` fallback where the related local key is `id`

## Out Of Scope

- `MorphableMixin` query-style helpers
- query builder changes

## Acceptance

- `new Comment().commentable().getResults(...)` works on Mongo
- `new Post().comments().getResults(...)` works on Mongo
- `new Post().image().getResults(...)` works on Mongo
- `new Comment().with("commentable").find(id)` works on Mongo
- `new Post().with("comments", "image").find(id)` works on Mongo
