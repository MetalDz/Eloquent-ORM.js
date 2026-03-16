# Package Docs And Examples Rename Plan

Status: COMPLETED

Last updated: 2026-03-16 09:42

## Goal
Finish the public rename from `eloquentjs` to `eloquent-orm.js` across shipped docs, repo examples, and generator-facing import resolution.

## Delivered
- Updated public docs and README snippets to use `eloquent-orm.js` and `eloquent-orm.js/Model`.
- Updated shipped example factory files in `src/app` and `src/test` to import from `eloquent-orm.js`.
- Updated `src/cli/utils/ImportResolver.ts` fallback behavior so generated installed-package imports default to `eloquent-orm.js`.
- Added local TypeScript self-alias paths so repo typecheck accepts `eloquent-orm.js` and `eloquent-orm.js/Model` in shipped examples.
- Updated example-generation fixture strings in `src/lab_test/support/cli.integration.harness.ts`.
- Refreshed the matching documentation and rename-sensitive regression tests.

## Locked By
- `src/lab_test/package.docs-and-examples.rename.logic.test.ts`
