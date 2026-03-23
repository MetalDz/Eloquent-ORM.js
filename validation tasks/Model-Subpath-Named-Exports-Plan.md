# Model Subpath Named Exports Plan

Status: COMPLETED

## Goal
Make `@alpha.consultings/eloquent-orm.js/Model` a clean named-export hub for model base classes instead of a confusing default-export alias.

## Delivered
- Removed the default export from `src/Model.ts`.
- Removed the named `Model` export from the `@alpha.consultings/eloquent-orm.js/Model` subpath.
- Kept the root-package `Model` alias on `@alpha.consultings/eloquent-orm.js`.
- Exposed the following from `@alpha.consultings/eloquent-orm.js/Model`:
  - `SqlModel`
  - `MongoModel`
  - `ModelInstance`
  - `ModelAttrs`
- Updated package docs to show:
  - `import { Model } from "@alpha.consultings/eloquent-orm.js"`
  - `import { SqlModel, MongoModel, type ModelInstance } from "@alpha.consultings/eloquent-orm.js/Model"`

## Result
Consumers now have a consistent split:

```ts
import { Model } from "@alpha.consultings/eloquent-orm.js";
import { SqlModel, MongoModel, type ModelInstance } from "@alpha.consultings/eloquent-orm.js/Model";
```

That keeps the Laravel-style root alias while making the model subpath explicit and non-ambiguous.
