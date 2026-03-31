# NodeNext Source Specifier Rewrite Plan

Status: COMPLETED

## Goal
Mechanically rewrite the source tree so local relative ECMAScript-style specifiers are NodeNext-safe without changing ORM logic:
- static `import ... from "./x"` becomes `import ... from "./x.js"` when `./x.ts` exists
- `export ... from "./x"` follows the same rule
- dynamic `import("./x")` follows the same rule
- `import("./x").Type` style type imports follow the same rule

## What This Task Covers
- source-tree local specifier rewriting for `src/**/*` and `bin/**/*`
- filesystem-aware resolution to sibling files or `index.*`
- mechanical, repeatable rewrites through a codemod script

## What This Task Does Not Cover
- CommonJS `require()` call conversion
- unrelated type issues exposed after the specifier rewrite
- generator/template output; that was handled in task 5
- release/test assertion cleanup; that is task 7

## Implemented Tooling
- `scripts/rewrite-nodenext-source-specifiers.cjs`
- `src/lab_test/nodenext.source-specifier-rewrite.logic.test.ts`

## Resolution Rules
- `.ts` and `.tsx` source targets emit `.js` specifiers
- `.mts` source targets emit `.mjs` specifiers
- `.cts` source targets emit `.cjs` specifiers
- directory imports are rewritten to explicit `index.*` runtime specifiers
- already-qualified runtime imports like `.js`, `.mjs`, `.cjs`, and `.json` are left unchanged
- Jest source tests map relative `.js` specifiers back to the underlying `.ts` files through `moduleNameMapper`

## Review Focus
- `src/core/schema/SchemaBuilder.ts`
- `src/core/model/BaseModel.ts`
- `src/lab_test/**/*`
- `src/test/**/*`

## Required Validation
- `npm.cmd run typecheck:nodenext`
- `cmd /c npm.cmd run test:pack-smoke:docker`

## Expected Follow-up
After this task, remaining work shifts from mechanical import churn to:
- exact-string test and fixture cleanup
- residual type issues that NodeNext surfaced once specifiers are corrected
