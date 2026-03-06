# Hook Access Control Plan (Model Registry)

## Goal
Ensure only granted/registered models can participate in hook registration and hook execution plumbing, while keeping runtime overhead minimal.

## Scope
- Restrict public hook mutation surface.
- Introduce model registry and internal hook store.
- Preserve expected ORM lifecycle behavior for registered models.
- Add regression tests and migration notes.

## Design Decisions
- Use `WeakSet<Function>` for granted model constructors.
- Use `WeakMap<Function, HookBucket>` for internal hook storage.
- Keep hot-path checks O(1): `registry.has(ModelCtor)`.
- Keep backward compatibility where possible, but fail fast on unauthorized models.

## Work Plan

### Phase 1: Internal Infrastructure
- [x] Create `ModelRegistry` utility with:
  - [x] `grant(modelCtor)`
  - [x] `revoke(modelCtor)`
  - [x] `isGranted(modelCtor)`
  - [x] `listGranted()` (debug/test only)
- [x] Create internal `HookStore` utility with:
  - [x] `add(modelCtor, event, handler)` guarded by `ModelRegistry.isGranted`
  - [x] `get(modelCtor, event)`
  - [x] `clear(modelCtor?)` for tests

### Phase 2: Replace Public Hook Mutation
- [x] Refactor `HooksMixin`:
  - [x] Remove or deprecate direct static mutable `hooks` map.
  - [x] Route hook registration through guarded internal APIs.
  - [x] Ensure firing hooks reads from internal `HookStore`.
- [x] Refactor `QueryCacheMixin`:
  - [x] Stop registering hooks via instance-level public API.
  - [x] Register cache invalidation hooks once per granted model.
  - [x] Prevent duplicate hook registration.

### Phase 3: Model Registration Flow
- [x] Define registration entrypoint:
  - [x] Package-level bootstrap (`registerModels([...])`) or
  - [x] Lazy registration at first model usage (with strict guard).
- [x] Enforce guard at runtime:
  - [x] Unauthorized model hook registration throws explicit error.
  - [x] Unauthorized model lifecycle hook access is blocked.

### Phase 4: Compatibility + DX
- [x] Add deprecation warnings for removed public APIs (if kept temporarily).
- [x] Add clear error messages:
  - [x] "Model not granted in ModelRegistry"
  - [x] "Hook registration denied for unregistered model"
- [x] Update docs:
  - [x] How to register models
  - [x] How hooks work after change
  - [x] Migration guide from old hook APIs

### Phase 5: Testing
- [x] Unit tests for `ModelRegistry` (grant/revoke/idempotency).
- [x] Unit tests for guarded `HookStore`.
- [x] Hook lifecycle tests:
  - [x] Registered model hooks fire exactly once.
  - [x] Unregistered model hook registration fails.
  - [x] No cross-model hook leakage.
- [x] Cache integration tests:
  - [x] Invalidation hooks do not duplicate per instance.
- [x] Run:
  - [x] `npm run typecheck`
  - [x] `npm test`

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Phase 1 implemented (`ModelRegistry`, `HookStore`, and unit tests).
- `2026-03-06`: Phase 2 implemented (`HooksMixin`/`QueryCacheMixin` migrated to guarded `HookStore`).
- `2026-03-06`: Phase 2 validation complete (targeted + full test suite, typecheck).
- `2026-03-06`: Phase 3 implemented (`registerModels([...])` bootstrap + strict lifecycle guard).
- `2026-03-06`: Phase 3 validation complete (targeted + full test suite, typecheck).
- `2026-03-06`: Phase 3 lazy registration completed (non-strict auto-grant on first hook/lifecycle touch, strict-mode guard preserved).
- `2026-03-06`: Phase 4 implemented (deprecation warnings + docs updates).
- `2026-03-06`: Phase 4 validation complete (targeted + full test suite, typecheck).

## Exit Criteria
- Only granted models can register/use lifecycle hooks.
- No duplicate hook growth across model instances.
- Existing supported model lifecycle features still pass test suite.
- Documentation updated with registration/bootstrap flow.
