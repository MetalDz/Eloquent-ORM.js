# Public Model Alias And Entry Plan

Status: COMPLETED

## Goal
Expose a Laravel-style SQL model import for package consumers without breaking the existing `SqlModel` and `MongoModel` API.

## Completed
- Added `Model` as a public alias of `SqlModel` in `src/index.ts`.
- Added a dedicated package subpath entry at `eloquentjs/Model`.
- Added `src/Model.ts` as the named-export consumer entry for:
  - `import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model"`
- Documented the alias in `src/documentation/api-reference.md`.
- Added a Laravel-style runtime example in `src/documentation/installation-and-quickstart.md`.
- Locked the surface with `src/lab_test/public.model.alias-and-entry.logic.test.ts`.

## Consumer Result
SQL-backed consumers can now use either:

```ts
import { Model } from "eloquentjs";
```

or:

```ts
import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model";
```

Mongo-backed consumers can use:

```ts
import { MongoModel } from "eloquentjs/Model";
```
