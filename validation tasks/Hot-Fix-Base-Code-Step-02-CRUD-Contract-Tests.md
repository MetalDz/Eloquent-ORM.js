# Hot Fix Base Code Step 02 - CRUD Contract Tests

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: READY

## Purpose

Define the exact contract-test slice that must land before runtime CRUD implementation changes.
This step keeps the API transition controlled by locking which tests move, which new assertions must be added, and which old public examples must stop being recommended.

## Existing tests that this slice governs

- `src/lab_test/instance.persistence.layer.contract.logic.test.ts`
- `src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `src/lab_test/real.model.instance.persistence.integration.logic.test.ts`
- `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`
- `src/lab_test/orm.hardening.phase4.real-model-read-persistence.logic.test.ts`
- `src/lab_test/orm.hardening.phase4.hydrated-dirty-tracking.logic.test.ts`
- `src/lab_test/safe.finder.api.contract.logic.test.ts`
- `src/lab_test/safe.finder.api.runtime.logic.test.ts`
- `src/lab_test/laravel.query-builder.contract.logic.test.ts`

## Contract assertions to add or update

### Create contract

- keep `new User(); user.fill(...); await user.save();` as a public creation path
- add the Laravel-like static target: `await User.create({ ... })`
- do not recommend factories as runtime CRUD

### Read contract

- keep `await User.find(1)` as the public primary-key read path
- keep `await User.findOneBy("email", "alice@example.com")`
- keep safe-finder chains such as `User.where(...).orderBy(...).limit(...).get()`

### Update contract

- change the public loaded-instance recommendation to:
  - `const found = await User.find(1);`
  - `found.update({ ... });`
  - `await found.save();`
- keep `patch()` as the partial persisted update path
- stop recommending `fill() + save()` as the primary update example once the new `update(...)` path is available

### Delete and restore contract

- change the public delete recommendation to `await found.delete();`
- change the public restore recommendation to `await found.restore();`
- keep direct-by-id APIs explicit and separately named:
  - `updateById`
  - `deleteById`
  - `restoreById`

### Bulk contract targets

- freeze the additive bulk signatures before runtime work starts:
  - `await User.createMany([{ ... }, { ... }])`
  - `await User.updateMany([1, 2], { status: "inactive" })`
  - `await User.patchMany([{ id: 1, ... }, { id: 2, ... }])`
  - `await User.deleteMany([1, 2])`
  - `await User.restoreMany([1, 2])`
- `createMany(...)` returns hydrated model instances in input order
- `updateMany(...)`, `deleteMany(...)`, and `restoreMany(...)` apply one payload or action across explicit primary keys
- `patchMany(...)` applies row-specific partial payloads and requires a primary-key field in each item
- this signature freeze is additive planning only; runtime support is still pending

## Generated artifact contract follow-up

- generated model templates must stop teaching low-level `new Model().delete(id)` once runtime support is ready
- generated service templates must align with loaded-instance update/delete/restore semantics
- generated controller templates must stay service-oriented and not bypass the service layer

## Documentation alignment required by this slice

- `README.md`
- `src/documentation/usage-guides.md`
- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`
- `docs/getting-started/usage-guides.mdx`
- `docs/getting-started/controllers.mdx`
- `docs/getting-started/services.mdx`
- `docs/api/querying.mdx`
- `docs/api/models.mdx`
- `docs/orm/soft-deletes.mdx`

## Exit criteria

- the test inventory is frozen before runtime CRUD code changes
- the new loaded-instance CRUD shape is explicitly named in contract docs
- bulk APIs are marked as target-tracked, not implied as already shipped
- no conflicting public example is left undocumented in the slice definition
