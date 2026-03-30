# NodeNext Blocker Audit

Status: SNAPSHOT LOCKED

Snapshot date: `2026-03-30`

## Why this audit exists
A direct flip from:
- `"module": "CommonJS"`
- `"moduleResolution": "node"`

to a source-tree `NodeNext` setup would break a large number of local imports immediately.

This audit records the current blocker surface before any migration work starts.

## Current blocker counts
- local relative import/require matches in `src` and `bin`: `1282`
- unique TypeScript files affected: `340`
- import/export local specifiers: `1160`
- local `require()` calls: `122`

## Current hotspot breakdown
- `src/lab_test`: `214 files / 886 matches`
- `src/cli`: `48 files / 214 matches`
- `src/core`: `41 files / 112 matches`
- `src/app`: `23 files / 39 matches`
- `src/test`: `11 files / 19 matches`
- `other`: `3 files / 12 matches`

## Main blockers
1. Relative import specifiers
- most source files currently use extensionless local imports such as `./x` and `../y`
- under NodeNext, runtime-facing local imports need an explicit emitted path strategy

2. Test volume
- `src/lab_test` is the largest migration surface
- many tests also assert exact import strings and package-surface content

3. Generator and template output
- scaffolding commands and templates can reintroduce old import style unless migrated together

4. CLI TypeScript runtime behavior
- the CLI loads consumer TypeScript files directly
- this loader must continue to support NodeNext-style local `.js` specifiers

5. Dual build contract
- the source tree may move toward NodeNext semantics
- but `dist/*` must stay CommonJS for current consumers

## What this means
- this is not a one-line `tsconfig` change
- this is a repo-wide module-surface migration
- the main effort is import plumbing and generated output, not ORM domain logic

## Safe execution order
1. lock plan
2. lock blocker audit
3. split config responsibilities
4. migrate imports/templates mechanically
5. re-run dual-surface validation

## Release note implication
If the public package contract stays stable, this should still be treated as compatibility work, not a breaking rewrite.
