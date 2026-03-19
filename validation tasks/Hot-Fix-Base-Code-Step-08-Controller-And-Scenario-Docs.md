# Hot Fix Base Code Step 08 - Controller and Scenario Docs

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Align controller and common-scenario documentation with the new public CRUD recommendation so controller/service examples do not drift back to the older instance-by-id write style.

## Scope

- update controller guidance to state that controllers stay thin and services should prefer `User.find(...)`, `User.create(...)`, loaded-instance `update(...); save()`, and explicit `User.deleteById(...)` / `User.restoreById(...)`
- update common-scenario guides so the first-copy examples match the same CRUD contract
- keep Express.js guidance intact while removing old recommended `new User().create(...)` snippets from scenario docs

## Out of scope

- generated controller template rewrites
- bulk CRUD documentation until the runtime bulk API slice lands

## Exit criteria

- controller and common-scenario docs recommend the same CRUD shape as the runtime usage guides
- source docs and Mintlify docs remain aligned
- guard tests lock the controller/scenario documentation surface
