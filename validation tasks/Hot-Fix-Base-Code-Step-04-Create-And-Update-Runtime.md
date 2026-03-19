# Hot Fix Base Code Step 04 - Create And Update Runtime

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Land the first additive runtime CRUD change without breaking the existing query surface.
This slice adds the static `create/find` convenience paths and the loaded-instance `update({...}); save()` path.

## Scope

- add static `Model.create(data)`
- add static `Model.find(id, pk?)`
- add loaded-instance `model.update(data)` as an in-memory persisted-model update helper
- keep low-level `model.update(id, data, pk?)` compatibility intact
- update generated model examples so they teach `update({...}); save()` for normal updates

## Out of scope

- loaded-instance `delete()` without id
- loaded-instance `restore()` without id
- `withTrashed().find(...)` chaining
- bulk CRUD targets

## Exit criteria

- runtime persistence suites cover static create/find and loaded-instance update
- compatibility path for `update(id, data, pk?)` remains intact
- generated model examples no longer center `patch()` as the only update example
