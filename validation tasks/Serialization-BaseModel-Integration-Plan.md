# Serialization BaseModel Integration Plan

Last updated: 2026-03-11  
Status: PLANNED

## Goal
- Integrate serialization into the default `BaseModel` stack.
- Make `toObject()` and `toJSON()` available on normal ORM models without adding a separate query-builder layer.
- Preserve current ORM behavior for SQL and `mongo` models.

## Target API
- Instance serialization on default models:
  - `user.toObject()`
  - `user.toJSON()`
- Eager-loaded model usage remains valid:
  - `const user = await new User().with("posts").find(1);`
  - `console.log(user?.toJSON());`

## Current Gap
- `SerializeMixin` already exists in `src/core/orm/mixins/SerializeMixin.ts`.
- `BaseModel` currently composes:
  - `MorphableMixin`
  - `PivotHelperMixin`
  - `CastsMixin`
  - `SoftDeletesMixin`
  - `ScopeMixin`
  - `HooksMixin`
  - `QueryCacheMixin`
  - `EagerLoadingMixin`
- `BaseModel` does not currently compose `SerializeMixin`.

## Scope
- Default `BaseModel` composition
- `SerializeMixin` integration
- Nested relation serialization
- Hidden/appended attribute behavior
- SQL and mongo model parity

## Non-Goals
- No full Laravel-style `query().where().first()` builder in this work.
- No breaking change to existing `find()` / `all()` / `with()` behavior.
- No driver-specific serialization forks unless required by correctness.

## Ordered Plan

### Phase 1: Contract Freeze
- [ ] Freeze the expected default serialization API on `BaseModel`.
- [ ] Freeze the non-goal that query-builder work is out of scope.

### Phase 2: BaseModel Composition
- [ ] Integrate `SerializeMixin` into the default `BaseModel` composition chain.
- [ ] Keep mixin ordering dependency-safe and additive.
- [ ] Preserve existing eager-loading behavior.

### Phase 3: Runtime Serialization Semantics
- [ ] Ensure `toObject()` excludes:
  - private/internal underscore-prefixed fields
  - fields listed in `hidden`
- [ ] Ensure `appends` are included in serialized output.
- [ ] Ensure arrays and nested related models serialize recursively.

### Phase 4: Cross-Driver Validation
- [ ] Validate serialization on SQL-backed models.
- [ ] Validate serialization on `mongo`-backed models.
- [ ] Validate eager-loaded relation serialization on both paths.

### Phase 5: Coverage and Docs
- [ ] Add focused runtime tests for default model serialization.
- [ ] Add regression tests for nested eager-loaded objects and arrays.
- [ ] Update usage examples to show `new User().with("posts").find(1)` plus `toJSON()`.

## Acceptance Criteria
- Any normal model extending `BaseModel` exposes `toObject()` and `toJSON()`.
- `new User().with("posts").find(1)` returns a model that can be serialized directly.
- Hidden fields stay excluded.
- Appended/computed attributes are included.
- Nested eager-loaded relations serialize recursively.
- SQL and `mongo` models behave consistently.
- No query-builder API is introduced as part of this change.

## Risks
- Mixin ordering mistakes can break eager loading or model typing.
- Recursive serialization can expose internal fields if the current guards are bypassed.
- Existing tests may assume plain object shape and need careful review after integration.

## Validation Strategy
- Contract test for this plan doc.
- Focused runtime tests around `BaseModel` serialization.
- SQL and mongo parity checks for serialized eager-loaded models.
- Typecheck pass after mixin integration.

## Notes
- This plan is intentionally smaller than the earlier Laravel-style query-builder proposal.
- Runtime implementation is not complete yet.
