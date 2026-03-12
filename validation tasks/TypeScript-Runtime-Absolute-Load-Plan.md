# TypeScript Runtime Absolute Load Plan

## Goal
Allow `loadModule()` to load generated `.ts` files from absolute temp directories during Jest runs without hitting Jest's module resolver.

## Scope
- Keep `ts-node` registration for direct `.ts` loads.
- Switch actual file loading to Node-native `createRequire(...)` bound to the target file.
- Preserve the existing `dist` fallback when `ts-node` is unavailable.

## Acceptance
- `loadModule()` can load a generated `.ts` module from a temp directory outside `src/`.
- Relative imports inside that generated temp module still resolve correctly.
- Scenario-generated persistence tests pass in CI.
