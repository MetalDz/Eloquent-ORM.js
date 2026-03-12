# Laravel-Style Query Builder Plan

Last updated: 2026-03-11  
Status: PLANNED

## Goal
- Add a first-class Laravel-style model query surface to the ORM.
- Make eager loading and serialization available in the default model runtime.
- Keep parity across SQL and Mongo model targets without weakening driver-specific correctness.

## Target API
- Static query entry:
  - `User.query()`
- Fluent filters:
  - `.where("status", "active")`
  - chained `.where(...)`
- Relation eager loading:
  - `.with("posts")`
  - nested eager loading like `.with("posts.comments")`
- Terminal operators:
  - `.first()`
  - `.get()`
- Default serialization:
  - `user.toJSON()`
  - `user.toObject()`

## Example Contract
```ts
const user = await User.query()
  .where("status", "active")
  .with("posts")
  .first();

console.log(user?.toJSON());
```

## Current Gap
- `BaseModel` composes `EagerLoadingMixin`, but not `SerializeMixin`.
- `CoreModel` exposes `find()` and `all()`, but no generic static `query()` builder.
- `MorphableMixin` assumes an ORM query contract, but the core runtime does not yet provide a unified implementation for normal models.

## Scope
- Runtime model API
- SQL driver query translation
- Mongo driver query translation
- Eager loading integration
- Serialization integration
- Test coverage and documentation

## Non-Goals
- No fake in-memory builder that bypasses the real adapters.
- No silent SQL-only implementation presented as cross-driver support.
- No breaking removal of existing `find()` / `all()` model APIs.

## Ordered Plan

### Phase 1: Contract Freeze
- [ ] Freeze the public query API:
  - `query`
  - `where`
  - `with`
  - `first`
  - `get`
- [ ] Freeze serialization contract:
  - `toObject`
  - `toJSON`
- [ ] Define parity expectations for SQL and `mongo`.

### Phase 2: Query Builder Core
- [ ] Add a reusable ORM query builder abstraction.
- [ ] Support model-bound metadata:
  - table / collection name
  - connection name
  - schema metadata
- [ ] Keep terminal operations deterministic:
  - `first()` returns one model or `null`
  - `get()` returns hydrated model arrays

### Phase 3: SQL Driver Execution
- [ ] Translate `where(...)` chains for:
  - `mysql`
  - `pg`
  - `sqlite`
- [ ] Reuse adapter-safe identifier wrapping and placeholders.
- [ ] Preserve existing hydration behavior from `CoreModel`.

### Phase 4: Mongo Driver Execution
- [ ] Translate `where(...)` chains into Mongo filters.
- [ ] Support eager-loading execution on mongo-hydrated model instances.
- [ ] Keep SQL adapter APIs unsupported on mongo.

### Phase 5: Eager Loading and Serialization Integration
- [ ] Wire `SerializeMixin` into the default model composition stack.
- [ ] Ensure `with(...)` works from the new query builder path.
- [ ] Preserve nested eager loading behavior.
- [ ] Ensure related models serialize recursively through `toObject()` / `toJSON()`.

### Phase 6: Validation, Coverage, and Docs
- [ ] Add focused runtime tests for:
  - SQL query builder happy paths
  - Mongo query builder happy paths
  - empty results
  - eager loading
  - serialization
- [ ] Add regression tests for unsupported or invalid query states.
- [ ] Update user-facing ORM examples and release notes.

## Acceptance Criteria
- Models support `Model.query().where(...).first()` and `Model.query().where(...).get()`.
- `with(...)` works from the query-builder path.
- `toObject()` and `toJSON()` are available on default `BaseModel` instances.
- SQL and mongo targets both execute through real driver-aware paths.
- Existing `find()` and `all()` behavior remains intact.

## Risks
- Builder abstraction can drift into SQL-first assumptions and break mongo parity.
- Serialization integration can expose internal fields if hidden/private handling is not preserved.
- Eager loading can regress if query-builder hydration diverges from current model hydration.

## Validation Strategy
- Contract test for this plan doc.
- Focused logic tests for query-builder runtime.
- Cross-driver integration checks for SQL and mongo targets.
- Coverage ratchet against new builder and serialization modules.

## Notes
- This plan is intentionally additive.
- Runtime implementation is not complete yet.
