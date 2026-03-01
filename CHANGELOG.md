# Changelog

## Pre-release Notes

### Breaking package-surface changes in `0.9.x`

- Root exports were narrowed to the supported public API in [src/index.ts](/src/index.ts).
- Deep imports into internal paths such as `eloquentjs/dist/core/*`, `eloquentjs/dist/cli/*`, or repo source paths are private and unsupported.
- Internal connection helpers and config objects are no longer part of the root package surface.
  - Removed from public root usage: `getConnection`, `getAdapter`, `closeAllConnections`, `resolveConnectionName`, `DriverAdapter`, `dbConfig`, and cache internals.
- Generated consumer code now imports from `eloquentjs` package root instead of internal relative source paths.

### Consumer action

- Update app imports to use only documented root exports from `eloquentjs`.
- Regenerate CLI-created models/factories/scenarios if they were produced before the package-surface hardening work.
