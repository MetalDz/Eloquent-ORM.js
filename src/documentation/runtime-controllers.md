# Runtime Controllers

Last updated: 2026-03-19

Controllers are the HTTP edge of the runtime and should stay thin.

## Core rule

- controllers bind routes and return HTTP responses
- services own persistence and query composition
- controllers should not own cache policy or relation loading policy

## Preferred runtime contract behind controllers

- `User.find(...)`
- `User.create(...)`
- loaded-instance `update(...); save()`
- `User.deleteById(...)`
- `User.restoreById(...)`
