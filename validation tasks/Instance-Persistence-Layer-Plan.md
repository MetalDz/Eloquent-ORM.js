# Instance Persistence Layer Plan

Last updated: 2026-03-12  
Status: IN PROGRESS

## Goal
- Add a true instance persistence layer on top of the existing safe ORM runtime.
- Support `fill()`, `save()`, and `patch()` without opening raw-query risk.
- Keep SQL and `mongo` behavior aligned through the existing validated `create()` / `update()` paths.

## Target API
- `model.fill(data)`
- `await model.save()`
- `await model.patch(data)`

## Example Contract
```ts
const user = new User();

user.fill({
  name: "Alice",
  email: "alice@example.com",
});

await user.save();

user.fill({ name: "Alice 2" });
await user.save();

await user.patch({ email: "alice-2@example.com" });
```

## Safety Contract
- `fill()` only accepts schema-backed column fields.
- `save()` and `patch()` must persist through existing model `create()` / `update()` logic.
- SQL paths must keep placeholder binding and adapter-safe identifiers.
- Mongo paths must keep native filter/update objects.
- Primary key mutation on persisted models must fail fast.

## Current Gap
- Models already support instance `create(data)`, `update(id, data)`, and `delete(id)`.
- Models do not yet support Active Record-style `fill()`, `save()`, or `patch()`.
- Hydrated models do not currently track persistence snapshot state for dirty detection.

## Scope
- Instance-level persistence state tracking
- Dirty-field detection
- Schema-validated `fill()`
- `save()` for create-or-update behavior
- `patch()` for partial persisted updates

## Non-Goals
- No raw SQL update surface.
- No mass-assignment of relation or unknown fields.
- No implicit primary-key rewrites on persisted models.
- No replacement of existing `create()` / `update()` / `delete()` APIs.

## Ordered Plan

### Phase 1: Contract Freeze
- [ ] Freeze the instance persistence API:
  - `fill`
  - `save`
  - `patch`
- [ ] Freeze schema-backed assignment rules.

### Phase 2: Persistence State Tracking
- [ ] Track whether a model instance is persisted.
- [ ] Track original persisted attribute snapshot for dirty detection.
- [ ] Sync state on hydration and post-create.

### Phase 3: Safe Assignment
- [ ] Allow `fill()` only for schema-backed column fields.
- [ ] Reject relation fields and unknown fields.
- [ ] Exclude internal runtime fields from persistence payloads.

### Phase 4: Save/Patch Runtime
- [ ] `save()` creates when the model is new.
- [ ] `save()` updates only dirty fields when the model is persisted.
- [ ] `patch(data)` performs partial persisted updates only.
- [ ] Persisted primary key changes fail fast.

### Phase 5: Coverage and Docs
- [ ] Add focused SQL and `mongo` tests for:
  - `fill()`
  - `save()` create/update path
  - `patch()`
  - primary-key mutation guards
- [ ] Document the difference between:
  - `create(data)`
  - `update(id, data)`
  - `fill().save()`
  - `patch(data)`

## Acceptance Criteria
- Default models expose `fill()`, `save()`, and `patch()`.
- `fill()` only accepts schema-backed column fields.
- `save()` creates new rows/documents for new models.
- `save()` updates only dirty persisted fields.
- `patch()` performs partial updates on persisted models.
- SQL and `mongo` execution remain driver-safe.
- Existing CRUD APIs remain intact.

## Risks
- Dirty tracking can become incorrect if hydration state is not synchronized.
- Over-broad assignment can accidentally persist internal or relation data.
- Save semantics can become ambiguous if persisted primary keys are allowed to drift.

## Validation Strategy
- Contract test for this plan doc.
- Focused runtime tests for SQL and `mongo`.
- Typecheck pass after runtime introduction.

## Notes
- This is an Active Record convenience layer on top of existing safe CRUD, not a raw query feature.
- Runtime implementation is active; end-to-end coverage is still expanding.
