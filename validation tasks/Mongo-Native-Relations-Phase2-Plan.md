# Mongo Native Relations Phase 2 Plan

## Goal

Add native Mongo support for `hasOne`, including eager-loading through the existing `with(...)` path.

## Scope

- `HasOne.getResults()` on Mongo
- `HasOne.match()` on Mongo
- eager loading through `new Model().with("profile").find(id)`
- `id` / `_id` fallback semantics matching the rest of the Mongo runtime

## Out Of Scope

- `belongsToMany` relation resolution
- morph relations
- SQL behavior changes

## Acceptance

- `hasOne` resolves directly on Mongo-backed models
- eager loading assigns the related model under the requested relation key
- SQL relation tests still pass unchanged
