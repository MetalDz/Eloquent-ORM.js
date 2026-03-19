# Hot Fix Base Code Step 06 - ById Helpers Coverage

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Coverage targets

- SQL `Model.updateById(...)`
- Mongo `Model.updateById(...)`
- SQL `Model.deleteById(...)`
- Mongo `Model.deleteById(...)`
- SQL `Model.restoreById(...)`
- Mongo `Model.restoreById(...)`

## Guard rules

- keep 100% statements, branches, functions, and lines
- instance by-id compatibility must remain intact while the static helpers land
