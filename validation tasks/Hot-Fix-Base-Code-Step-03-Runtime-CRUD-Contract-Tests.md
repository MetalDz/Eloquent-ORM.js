# Hot Fix Base Code Step 03 - Runtime CRUD Contract Tests

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: READY

## Purpose

Define the first live runtime-test slice that will change existing persistence suites.
This step names the concrete suites, the assertions that must change, and the compatibility rules that keep the rollout additive while the runtime is being refactored.

## Existing suites that will change first

- `src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `src/lab_test/real.model.instance.persistence.integration.logic.test.ts`
- `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`

## Required runtime assertions

### Create

- keep loaded-instance creation via:
  - `const user = new User();`
  - `user.fill({ ... });`
  - `await user.save();`
- add the static target contract once runtime support exists:
  - `await User.create({ ... })`

### Read

- keep `await User.find(id)` as the preferred primary-key read path
- keep `await User.findOneBy(field, value)` for single-record filtered reads
- keep safe-finder chains Laravel-like and unchanged during this slice

### Update

- add loaded-instance update expectations for:
  - `const found = await User.find(id);`
  - `found.update({ ... });`
  - `await found.save();`
- keep `await found.patch({ ... })` as the partial-update path
- do not remove dirty-tracking expectations

### Delete

- add loaded-instance delete expectations for:
  - `const found = await User.find(id);`
  - `await found.delete();`
- direct by-id delete remains a compatibility path until the deprecation slice lands

### Restore

- add loaded soft-delete restore expectations for:
  - `const found = await User.withTrashed().find(id);`
  - `await found.restore();`
- direct by-id restore remains a compatibility path until the deprecation slice lands

### Bulk runtime targets

- freeze the first runtime bulk signatures as:
  - `await User.createMany([{ ... }, { ... }])`
  - `await User.updateMany([1, 2], { status: "inactive" })`
  - `await User.patchMany([{ id: 1, ... }, { id: 2, ... }])`
  - `await User.deleteMany([1, 2])`
  - `await User.restoreMany([1, 2])`
- do not implement or document alternate bulk signatures during the hot fix
- bulk runtime assertions land only after the single-record CRUD runtime slice stays green

## Generated artifact alignment in this slice

- generated model examples must stop centering `patch()` as the only post-create update example
- generated model examples must eventually show loaded-instance `update(...) + save()`
- generated service and controller examples must move toward loaded-instance delete and restore semantics

## Compatibility rules

- this slice is additive first
- old low-level by-id runtime paths may remain temporarily, but must stop being the recommended public shape
- no query-builder regression is allowed while CRUD runtime tests are moving
- no generated artifact example may contradict the frozen target after its template is updated

## Exit criteria

- the first four runtime persistence suites are explicitly mapped to the new CRUD target
- loaded-instance update/delete/restore assertions are named before implementation
- static create is called out as gated on runtime support
- compatibility wording is explicit so the refactor does not accidentally become a breaking change
