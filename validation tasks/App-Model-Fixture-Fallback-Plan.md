# App Model Fixture Fallback Plan

## Goal

Keep app-model integration tests stable when `src/app/models` is absent in CI or minimal package checkouts.

## Approach

- Resolve app models from `src/app/models` first when present.
- Fall back to committed fixture models under `src/lab_test/support/app-model-fixtures`.
- Keep the runtime path based on `loadModule(...)` so tests still exercise real model classes.

## Coverage

- Resolver returns the real app model when available.
- Resolver can force fixture mode for deterministic tests.
- Dynamic loading works for both `AppSmoke` and `GeoLocalisation`.
