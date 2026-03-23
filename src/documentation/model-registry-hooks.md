# Model Registry and Hook Access

## Why this exists
Hook registration and lifecycle execution are now guarded so only approved models can access hook pipelines.

## Register models at bootstrap

Generate a bootstrap helper with the CLI:

```bash
eloquent make:registry
```

or for test fixtures:

```bash
eloquent make:registry --test
```

Then import the generated helper in your app bootstrap:

```ts
import { registerAppModels } from "./app/registerModels";

registerAppModels();
```

Manual bootstrap remains supported:

```ts
import { registerModels } from "@alpha.consultings/eloquent-orm.js";
import { User } from "./app/models/User";
import { Post } from "./app/models/Post";

registerModels([User, Post]); // strict mode enabled by default
```

Optional non-strict bootstrap:

```ts
registerModels([User, Post], { strict: false });
```

## How hooks work now
- In strict mode, hook registration is denied for unregistered models.
- In strict mode, lifecycle hook execution (`create`, `update`, `delete` hook pipeline) is denied for unregistered models.
- In non-strict mode, models are lazily granted on first hook registration or first lifecycle execution.
- Query cache invalidation hooks are attached once per granted model.

## Migration guide

### Previous behavior
- Any model could call:
  - `Model.on("created", fn)`
  - `model.registerHook("updated", fn)`
- No central registration gate existed.

### Current behavior
1. Register models once during startup using `registerModels([...])` or a generated `registerAppModels()` helper.
2. Keep strict mode enabled (default) for access control.
3. Prefer `static modelEvents` for user-defined lifecycle hooks.

### Deprecated APIs
- `Model.on(...)` and `model.registerHook(...)` are still available temporarily but emit deprecation warnings.
- Plan migration away from these APIs.
