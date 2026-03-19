# Runtime Overview

Last updated: 2026-03-19

Use this section when installation is already done and you want the runtime contract directly.

## Core runtime rule

- `new User()` for a transient in-memory model instance
- `User.create(...)` for one-shot persistence
- `User.find(...)`, `User.findOneBy(...)`, and safe-finder chains for reads
- loaded-instance `update(...); save()` and `patch(...)` for readable mutation
- `User.updateById(...)`, `User.deleteById(...)`, and `User.restoreById(...)` for explicit low-level by-id paths

## Runtime pages

- [Runtime CRUD](./runtime-crud.md)
- [Runtime Querying](./runtime-querying.md)
- [Runtime Models](./runtime-models.md)
- [Runtime Controllers](./runtime-controllers.md)
- [Runtime Services](./runtime-services.md)
- [Runtime Cache](./runtime-cache.md)
