# Root ESM Factory Eager Load Bug Note

Status: LOCKED

## Bug
The published root ESM package surface still touches `Factory` eagerly when a consumer imports the package root, even if the consumer does not request `Factory`.

## What happened
- A NodeNext / ESM consumer imports the package root for a non-factory symbol, for example:
  - `import { Model } from "@alpha.consultings/eloquent-orm.js"`
- The published ESM entry currently imports `Factory` eagerly.
- The published ESM default export also spreads the CommonJS package surface.
- The CommonJS root still exposes `Factory` through a getter that resolves the factory runtime.
- That runtime reaches `@faker-js/faker`.
- In Jest ESM consumer environments, that can fail with:
  - `Must use import to load ES Module ... @faker-js/faker/dist/index.js`

## Why this is a bug
- Root package imports for non-factory symbols must not load unrelated runtime branches eagerly.
- CommonJS compatibility and NodeNext compatibility are both public goals for this package.
- Consumers should only pay the `Factory` load cost when they explicitly import or access `Factory`.

## Scope
- Affects the published package surface.
- Does not mean CommonJS support should be removed.
- Does not mean the package should become ESM-only.
- Must be fixed without breaking:
  - CommonJS `require("@alpha.consultings/eloquent-orm.js")`
  - NodeNext / ESM root imports
  - explicit `./Factory` access

## Expected Fix Shape
- The published root ESM entry must not eagerly import `Factory`.
- The published root ESM default export must not accidentally touch `Factory` while composing the export surface.
- The root package should continue exposing `Factory` only through explicit access paths.
- Pack-smoke and targeted consumer-surface tests must prove:
  - plain root imports do not load `Factory`
  - explicit `Factory` imports still work

## What to say in release notes when fixed
- What's new headline:
  - `Patched. Root ESM imports no longer touch Factory eagerly, preserving CommonJS and NodeNext compatibility.`
- Exact update summary:
  - `Fix the published root ESM surface so non-factory root imports no longer trigger the factory runtime, preserving CommonJS consumers and stabilizing NodeNext/Jest ESM usage.`

## Validation after the fix
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/dual.package.cjs-esm.compatibility.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/package.root.lazy-factory.logic.test.ts`
- `npm.cmd run build`
- `npm.cmd run test:pack-smoke`
