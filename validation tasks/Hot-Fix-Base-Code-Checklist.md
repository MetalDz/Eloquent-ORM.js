# Hot Fix Base Code Checklist

Last updated: 2026-03-18
Owner: ORM core maintainers
Status: IN PROGRESS

## Status Legend

- [done]: verified in repo or explicitly captured in this checklist phase.
- [pending]: not completed or not yet verified.
- [exists-but-unreviewed]: file/test/doc exists, but checklist review or rerun is still pending.

## Goal

Lock a controlled hot-fix path for base-code changes while moving the public CRUD API toward a consistent Laravel-like design.
This checklist exists to prevent undocumented API drift, test blind spots, and coverage regression.
This phase is planning and guard-rail setup only. Do not start debugging unrelated failures during this step.

## Target outcome

- Querying remains Laravel-like and predictable.
- CRUD public usage becomes more consistent and intentionally documented.
- Every public API move is matched by runtime tests, contract tests, documentation updates, and coverage review.
- No hot fix lands without a rollback-safe checklist review.

## Design direction to validate

- [pending] Keep query reads Laravel-like: `Model.where(...).orderBy(...).limit(...).get()` and `Model.findOneBy(...)`.
- [pending] Lock the public CRUD shape before implementation:
  - create with `new User(); user.fill(...); await user.save();`
  - optional static create with `await User.create(...)`
  - read with `await User.find(...)`, `await User.findOneBy(...)`, and safe-finder chains
  - loaded-instance update with `found.update({...}); await found.save();`
  - persisted-instance partial update with `await found.patch({...});`
  - loaded-instance delete with `await found.delete();`
  - loaded soft-delete restore with `await found.restore();`
- [pending] Add Laravel-like bulk targets:
  - `createMany`
  - `updateMany`
  - `patchMany`
  - `deleteMany`
  - `restoreMany`
- [done] Freeze the bulk target signatures before implementation:
  - `await User.createMany([{ ... }, { ... }])`
  - `await User.updateMany([1, 2], { status: "inactive" })`
  - `await User.patchMany([{ id: 1, email: "a@example.com" }, { id: 2, email: "b@example.com" }])`
  - `await User.deleteMany([1, 2])`
  - `await User.restoreMany([1, 2])`
- [pending] Add direct by-id public targets:
  - `updateById`
  - `deleteById`
  - `restoreById`
- [pending] Do not ship mixed examples that recommend both old and new public CRUD shapes without deprecation notes.

## Public target API snapshot

```ts
// Create
const user = new User();
user.fill({ name: "Alice", email: "alice@example.com" });
await user.save();

// or
const created = await User.create({ name: "Alice", email: "alice@example.com" });

// Read
const found = await User.find(1);
const one = await User.findOneBy("email", "alice@example.com");
const rows = await User.where("is_active", true).orderBy("created_at", "desc").limit(20).get();

// Update
const foundToUpdate = await User.find(1);
if (foundToUpdate) {
  foundToUpdate.update({ name: "Alice Updated" });
  await foundToUpdate.save();
}

// Patch
const foundToPatch = await User.find(1);
if (foundToPatch) {
  await foundToPatch.patch({ name: "Alice Patch" });
}

// Delete
const foundToDelete = await User.find(1);
if (foundToDelete) {
  await foundToDelete.delete();
}

// Restore
const foundToRestore = await User.withTrashed().find(1);
if (foundToRestore) {
  await foundToRestore.restore();
}

// Bulk targets (signature freeze only for now)
const createdMany = await User.createMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
]);
await User.updateMany([1, 2], { status: "inactive" });
await User.patchMany([
  { id: 1, email: "alice+1@example.com" },
  { id: 2, email: "bob+1@example.com" },
]);
await User.deleteMany([1, 2]);
await User.restoreMany([1, 2]);
```

## Required pre-change checklist

- [done] Capture the current `npm run test:coverage` baseline before the first API hot-fix change.
- [done] Capture the current `npm run test:pack-smoke` baseline before the first API hot-fix change.
- [done] List the exact public methods, aliases, and examples that will change.
- [done] Mark the change as additive, deprecating, or breaking before implementation starts.
- [pending] Freeze the docs files and generated templates that must move together with the code.
- [pending] Do not start debugging unrelated failures during this checklist phase.

## Previous tests that must stay green or be updated intentionally

- [exists-but-unreviewed] `src/lab_test/instance.persistence.layer.contract.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/real.model.instance.persistence.integration.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/orm.hardening.phase4.real-model-read-persistence.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/orm.hardening.phase4.hydrated-dirty-tracking.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/safe.finder.api.contract.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/safe.finder.api.runtime.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/laravel.query-builder.contract.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/documentation.usage.gaps.logic.test.ts`
- [done] `src/lab_test/documentation.usage.gaps.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/lts.phase4.consumer-documentation-suite.logic.test.ts`
- [exists-but-unreviewed] `src/lab_test/package.docs-and-examples.rename.logic.test.ts`
- [pending] `npm run test:pack-smoke`

## Documentation files that must be reviewed together

- [exists-but-unreviewed] `README.md`
- [exists-but-unreviewed] `docs/getting-started/installation.mdx`
- [exists-but-unreviewed] `docs/getting-started/quick-start.mdx`
- [exists-but-unreviewed] `docs/getting-started/usage-guides.mdx`
- [exists-but-unreviewed] `docs/getting-started/controllers.mdx`
- [exists-but-unreviewed] `docs/getting-started/services.mdx`
- [exists-but-unreviewed] `docs/api/querying.mdx`
- [exists-but-unreviewed] `docs/api/models.mdx`
- [exists-but-unreviewed] `docs/orm/soft-deletes.mdx`
- [exists-but-unreviewed] `src/documentation/installation-and-quickstart.md`
- [exists-but-unreviewed] `src/documentation/usage-guides.md`
- [exists-but-unreviewed] `src/documentation/usage-guides-controller.md`
- [exists-but-unreviewed] `src/documentation/usage-guides-services.md`

## Runtime section to publish during the hot fix

- [pending] Add a dedicated `Runtime CRUD patterns` section to consumer docs before finalizing the public CRUD shape.
- [pending] Add a dedicated `Runtime querying patterns` section alongside CRUD so read-path guidance stays consistent with the write-path design.
- [done] Add bulk helper guidance to runtime CRUD docs with one frozen signature set.
- [pending] Under `Querying`, explain:
  - `find(id)` vs `findOneBy(field, value)`
  - collection reads with `all()` and `get()`
  - safe-finder chaining with `where(...)`, `orderBy(...)`, and `limit(...)`
  - eager loading with `with(...)` / `load(...)`
  - scope-based querying
  - recommended service-layer query composition
- [pending] Under `Create`, explain:
  - when to use `create(data)`
  - when to use `fill(...) + save()`
  - when to use `createMany(...)`
  - what `new Model()` means in memory vs persistence
- [done] Under `Create`, explain:
  - when to use `create(data)`
  - when to use `fill(...) + save()`
  - when to use `createMany(...)`
  - what `new Model()` means in memory vs persistence
- [pending] Under `Update`, explain:
  - loaded-instance updates with `update(...) + save()`
  - partial updates with `patch(...)`
  - direct by-id update via `updateById(...)`
  - bulk updates via `updateMany(...)`
- [done] Under `Update`, explain:
  - loaded-instance updates with `update(...) + save()`
  - partial updates with `patch(...)`
  - direct by-id update via `updateById(...)`
  - bulk updates via `updateMany(...)`
- [pending] Under `Delete`, explain:
  - loaded-instance delete semantics
  - direct delete by primary key via `deleteById(...)`
  - bulk deletes via `deleteMany(...)`
  - hard delete vs soft delete expectations
- [done] Under `Delete`, explain:
  - loaded-instance delete semantics
  - direct delete by primary key via `deleteById(...)`
  - bulk deletes via `deleteMany(...)`
  - hard delete vs soft delete expectations
- [pending] Under `Restore`, explain:
  - soft-delete requirement
  - restore flow and service/controller use
  - direct restore by primary key via `restoreById(...)`
  - bulk restore via `restoreMany(...)`
  - when restore is unavailable
- [done] Under `Restore`, explain:
  - soft-delete requirement
  - restore flow and service/controller use
  - direct restore by primary key via `restoreById(...)`
  - bulk restore via `restoreMany(...)`
  - when restore is unavailable
- [pending] Ensure the runtime section uses one consistent Laravel-like recommendation and does not leave conflicting examples behind.
- [done] Ensure the runtime section uses one consistent Laravel-like recommendation and does not leave conflicting examples behind.

## Model section to publish during the hot fix

- [pending] Add a dedicated `Model` section that explains model design before CRUD examples are finalized.
- [pending] Separate SQL and Mongo model guidance clearly.

### SQL model documentation scope

- [pending] Explain MySQL use cases:
  - typical production web apps
  - broad hosting availability
  - conventional relational CRUD workloads
- [pending] Explain PostgreSQL use cases:
  - stricter relational workloads
  - advanced SQL features and richer query semantics
  - systems that prefer PostgreSQL-native operations
- [pending] Explain SQLite use cases:
  - local development
  - lightweight apps
  - test isolation and file-based workflows
- [pending] Explain relation types in SQL models:
  - `belongsTo`
  - `hasOne`
  - `hasMany`
  - `belongsToMany`
  - `morphOne`
  - `morphMany`
  - `morphTo`
- [pending] Explain when SQL constraints, pivot tables, and migration-backed integrity should be preferred.

### Mongo model documentation scope

- [pending] Explain Mongo use cases:
  - document-first workloads
  - flexible shapes
  - NoSQL scenario generation and explicit `--mongo` flows
- [pending] Explain relation handling in Mongo models:
  - `belongsTo`
  - `hasOne`
  - `hasMany`
  - `belongsToMany`
  - `morphOne`
  - `morphMany`
  - `morphTo`
- [pending] Explain Mongo-specific caveats:
  - no SQL foreign-key guarantees
  - relation support depends on explicit model methods
  - avoid documenting SQL-only assumptions in Mongo examples
- [pending] Explain when Mongo is the better fit than SQL and when it is not.

## Coverage guard

- [done] Record the pre-hot-fix coverage snapshot.
- [pending] No public CRUD hot fix merges with lower statement, branch, function, or line coverage than the captured baseline.
- [pending] Every added alias or behavior branch gets a matching runtime regression.
- [pending] Every removed or redirected public path gets a contract test and a doc update.
- [pending] If a generated artifact changes, add generator test coverage and pack-smoke validation.
- [pending] Final verification must include `npm run test:coverage`, `npm run test:pack-smoke`, `npm run docs:lint`, and `npm run docs:build`.
- [pending] Final verification must include `npm run test:coverage`, `npm run test:pack-smoke`, `npm run docs:lint`, and `npm run docs:build`.
  - Current blocker: `docs:lint` and `docs:build` fail because local `@mintlify/cli` is missing from `node_modules`.

## Execution order

1. Freeze the public CRUD target and alias strategy.
2. Update contract tests first.
3. Update runtime tests.
4. Update generated-artifact tests.
5. Update docs and examples.
6. Run coverage and pack smoke.
7. Only then start implementation or refactor slices if the checklist remains green.

## Exit criteria

- One clear Laravel-like CRUD recommendation is documented.
- The public target API snapshot is either implemented or explicitly broken into tracked follow-up slices with no undocumented drift.
- No conflicting CRUD examples remain in docs.
- Runtime CRUD patterns are documented in a way that explains creation, update, delete, and restore precisely.
- Runtime querying patterns are documented in a way that explains single-record reads, collection reads, eager loading, scopes, and service-layer query composition.
- Model documentation clearly separates SQL and Mongo and explains each relation type with use-case guidance.
- All listed tests are green or intentionally updated with rationale.
- Coverage is equal to or higher than the captured baseline.
- Pack smoke and docs validation pass.

