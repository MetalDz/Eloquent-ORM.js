# Model Subpath Named Exports Plan

Status: COMPLETED

## Goal
Make `eloquentjs/Model` a clean named-export hub for model base classes instead of a confusing default-export alias.

## Delivered
- Removed the default export from `src/Model.ts`.
- Removed the named `Model` export from the `eloquentjs/Model` subpath.
- Kept the root-package `Model` alias on `eloquentjs`.
- Exposed the following from `eloquentjs/Model`:
  - `SqlModel`
  - `MongoModel`
  - `ModelInstance`
  - `ModelAttrs`
- Updated package docs to show:
  - `import { Model } from "eloquentjs"`
  - `import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model"`

## Result
Consumers now have a consistent split:

```ts
import { Model } from "eloquentjs";
import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model";
```

That keeps the Laravel-style root alias while making the model subpath explicit and non-ambiguous.
