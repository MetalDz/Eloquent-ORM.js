# Automatic CJS ESM Generation Plan

Status: LOCKED

## Goal
Make `npm run build` regenerate the published dual-package surface automatically:
- `dist/*` remains the CommonJS runtime surface
- `esm/*` becomes generated build output for ESM / NodeNext consumers
- CommonJS consumers must keep working without any public API break

## Why
- Hand-maintained `esm/*.mjs` files can drift away from the real package surface.
- The package already promises both:
  - CommonJS `require("@alpha.consultings/eloquent-orm.js")`
  - ESM / NodeNext `import { ... } from "@alpha.consultings/eloquent-orm.js"`
- The build must regenerate both surfaces from one source-of-truth step.

## Locked Build Shape
1. Keep the TypeScript compiler path that generates `dist/*` as CommonJS.
2. Add a build step that generates the `esm/*` entrypoints automatically.
3. Treat the ESM entry generation script as the source of truth for the published ESM surface.
4. Do not hand-edit generated `esm/*` files after the build step.
5. Keep the package export map explicit for both `require` and `import`.

## Scope For This Pass
- Regenerate the package root ESM entrypoint.
- Regenerate the `Factory` ESM subpath entrypoint.
- Regenerate the `Model` ESM subpath entrypoint.
- Keep CLI behavior unchanged.
- Keep the package root `type` stable for CommonJS consumers.

## Non-Goals For This Pass
- Do not convert the whole source tree to NodeNext.
- Do not remove the CommonJS compiler output.
- Do not make the package ESM-only.
- Do not rename public exports or public subpaths.

## Required Validation
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/automatic.cjs-esm.generation.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/package.root.lazy-factory.logic.test.ts src/lab_test/dual.package.cjs-esm.compatibility.logic.test.ts`
- `npm.cmd run test:pack-smoke`

## Release Rule
- If CommonJS behavior is preserved and the ESM surface is only made more reliable, release as `patch`.
