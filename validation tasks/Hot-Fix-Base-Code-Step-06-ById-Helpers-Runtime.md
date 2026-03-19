# Hot Fix Base Code Step 06 - ById Helpers Runtime

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Replace the awkward low-level `new Model().update(id, data)` style with explicit static by-id helpers while keeping compatibility intact.

## Scope

- add static `Model.updateById(id, data, pk?)`
- add static `Model.deleteById(id, pk?)`
- add static `Model.restoreById(id, pk?)`
- keep existing instance by-id compatibility paths during the hot-fix phase

## Out of scope

- docs rewrite to remove old low-level examples
- `withTrashed().find(...)` chaining
- bulk by-id helpers

## Exit criteria

- runtime exposes explicit by-id helpers
- SQL and Mongo helper paths are covered
