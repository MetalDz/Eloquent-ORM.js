# Hot Fix Base Code Step 07 - Docs Alignment

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Align consumer documentation with the new public CRUD recommendation now that the runtime supports static create/find, loaded-instance update/delete/restore, and explicit by-id helpers.

## Scope

- update runtime usage guides to prefer `User.create(...)`, `User.find(...)`, `found.update(...); await found.save()`, `await found.delete()`, and `await found.restore()`
- document `User.updateById(...)`, `User.deleteById(...)`, and `User.restoreById(...)` as the explicit low-level path
- update service and controller guidance to reflect the preferred model/service flow
- keep query guidance Laravel-like and consistent with the new CRUD wording

## Out of scope

- generator template rewrites for services/controllers
- `withTrashed().find(...)` chaining guidance until the runtime story is finalized

## Exit criteria

- source docs and Mintlify docs recommend one consistent CRUD shape
- the doc-smoke tests are updated to the new recommendation
- old `new User().update(id, data)` / `new User().delete(id)` examples are removed from the recommended path
