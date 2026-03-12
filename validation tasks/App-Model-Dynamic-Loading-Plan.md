# App Model Dynamic Loading Plan

## Goal

Keep lab tests from depending on compile-time imports of app model files that may be generated, moved, or omitted in some environments.

## Rule

- Lab tests that need real app models should load them dynamically through `loadModule(...)`.
- Avoid static imports such as `import { AppSmoke } from "../app/models/AppSmoke";` inside `src/lab_test`.

## Regression Coverage

- Ensure `AppSmoke.ts` can be loaded dynamically.
- Ensure `GeoLocalisation.ts` can be loaded dynamically.
- Keep `typecheck` green without requiring static module resolution from test files into app-model paths.
