# EagerLoading getRelation Contract Plan

## Goal
- Freeze the post-fix `EagerLoadingMixin.getRelation()` behavior.

## Contract
- `getRelation(name)` returns the resolved relation object, not the raw model method.
- The returned object must expose:
  - `name`
  - `getResults()`
  - `match()`

## Why
- Nested eager loading now depends on relation objects instead of method references.
- Older coverage tests still expected the pre-fix method shape.

## Acceptance
- The legacy phase-6 branch suite matches the current runtime behavior.
- A dedicated contract test guards `getRelation()` object semantics.
