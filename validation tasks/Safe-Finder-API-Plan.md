# Safe Finder API Plan

Last updated: 2026-03-11  
Status: PLANNED

## Goal
- Add a constrained, schema-validated finder API to the ORM.
- Support common read patterns without exposing a raw or open-ended query builder.
- Keep SQL and `mongo` filtering safe through adapter-backed translation.

## Target API
- Query-style terminals:
  - `where(field, value)`
  - `with(...relations)`
  - `active()`
  - `inactive()`
  - `published()`
  - `first()`
  - `get()`
  - `limit(count)`
  - `orderBy(field, direction)`
- Narrow convenience helpers:
  - `findBy(field, value)`
  - `findOneBy(field, value)`
  - `findAllBy(filters)`
  - `existsBy(filters)`

## Example Contract
```ts
const activeUsers = await User.where("status", "active")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

const author = await User.where("id", 7)
  .with("posts")
  .active()
  .first();

const archived = await User.inactive().get();
const publishedPosts = await Post.published().limit(20).get();

const admin = await User.findOneBy("email", "admin@example.com");
const exists = await User.existsBy({ status: "active", role: "admin" });
```

## Safety Contract
- All filterable fields must be validated against model schema.
- All SQL values must use adapter placeholders and bound params.
- Identifier handling must use adapter-safe wrapping, never raw concatenation.
- Unsupported fields or operators must fail fast.
- Raw SQL is out of scope.

## Current Gap
- `CoreModel` provides `find()` and `all()`, but not constrained filtering helpers.
- `ScopeMixin` is currently an in-memory post-fetch filter for `all()` / `find()`, not a driver-backed finder API.
- There is no default schema-validated filtering surface shared across SQL and `mongo`.

## Scope
- Default model finder surface
- Schema-aware field validation
- SQL adapter-backed filtering
- Mongo native filter translation
- Deterministic ordering and limit semantics
- Safe eager loading on finder results
- Narrow local-scope support through `.active()`, `.inactive()`, and `.published()`

## Non-Goals
- No raw SQL builder API.
- No arbitrary expression language.
- No full Laravel-style fluent query builder parity.
- No weakening of existing `find()` / `all()` behavior.

## Ordered Plan

### Phase 1: Contract Freeze
- [ ] Freeze the allowed finder methods:
  - `where`
  - `with`
  - `active`
  - `inactive`
  - `published`
  - `first`
  - `get`
  - `limit`
  - `orderBy`
  - `findBy`
  - `findOneBy`
  - `findAllBy`
  - `existsBy`
- [ ] Freeze the safety model around schema validation and adapter-backed execution.

### Phase 2: Schema Validation Layer
- [ ] Validate filter fields against model schema.
- [ ] Define allowed sort fields from schema.
- [ ] Reject unknown fields before any driver call.

### Phase 3: SQL Execution Path
- [ ] Translate safe filters using:
  - wrapped identifiers
  - placeholders
  - bound params
- [ ] Support:
  - equality `where(field, value)`
  - `orderBy(field, direction)`
  - `limit(count)`
- [ ] Keep terminal methods deterministic:
  - `first()` returns one model or `null`
  - `get()` returns hydrated model arrays

### Phase 4: Mongo Execution Path
- [ ] Translate safe filters into Mongo native filter objects.
- [ ] Support:
  - equality `where(field, value)`
  - sort translation from `orderBy`
  - `limit(count)`
- [ ] Keep parity for:
  - `findOneBy`
  - `findAllBy`
  - `existsBy`

### Phase 5: Runtime Coverage and Docs
- [ ] Add focused tests for:
  - unknown field rejection
  - SQL placeholder usage
  - Mongo filter translation
  - `first`, `get`, `limit`, `orderBy`
  - `with(...relations)` on finder results
  - `.active()` / `.inactive()` / `.published()` local-scope behavior
  - helper methods (`findBy`, `findOneBy`, `findAllBy`, `existsBy`)
- [ ] Document this as a safe finder layer, not a raw query builder.

## Acceptance Criteria
- Models expose the constrained finder API without exposing raw SQL entry points.
- Unknown filter fields are rejected before execution.
- SQL execution always uses adapter-safe placeholders and wrapped identifiers.
- Mongo execution uses native filter objects.
- `first`, `get`, `limit`, `orderBy`, `with`, `active`, `inactive`, and `published` work through the safe finder path.
- `findBy`, `findOneBy`, `findAllBy`, and `existsBy` work through schema-validated filtering.
- Existing `find()` and `all()` behavior remains intact.

## Risks
- Field validation can drift from schema semantics if schema metadata is incomplete.
- SQL and `mongo` parity can diverge around ordering and null semantics.
- Over-expanding the API beyond the frozen scope would reintroduce builder complexity.

## Validation Strategy
- Contract test for this plan doc.
- Focused runtime tests for schema validation failures and driver translation.
- SQL and `mongo` parity checks for helper methods and terminal methods.
- Typecheck pass after runtime introduction.

## Notes
- This plan intentionally replaces the broader Laravel-style query-builder direction with a narrower safe-finder design.
- Runtime implementation is not complete yet.
