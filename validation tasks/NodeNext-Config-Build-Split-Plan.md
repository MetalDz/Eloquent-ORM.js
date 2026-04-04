# NodeNext Config Build Split Plan

Status: LOCKED

## Goal
Keep one clear source-of-truth config for the repo while preserving the dual package build:
- shared compiler defaults live in one base config
- the root `tsconfig.json` is the NodeNext source-tree truth
- the published `dist/*` build remains CommonJS
- the published `esm/*` build remains explicit NodeNext output

## Locked Config Shape
- `tsconfig.base.json`
  - shared compiler defaults only
- `tsconfig.json`
  - source/typecheck/dev source of truth
  - uses `NodeNext` and `NodeNext` resolution rules
- `tsconfig.build.json`
  - explicit CommonJS build output for `dist/*`
- `tsconfig.esm.json`
  - explicit ESM build output for the published `esm/*` surface
- `tsconfig.test.json`
  - explicit Jest/CommonJS transpilation config so the test runner does not inherit source-tree NodeNext runtime semantics
- `typecheck:nodenext`
  - retained as an explicit CI alias, but now points at the root `tsconfig.json`

## Current State
- the repo source tree now typechecks under NodeNext from the root config
- CommonJS build stability stays protected in `tsconfig.build.json`
- published ESM entrypoints still compile from the dedicated `tsconfig.esm.json` build
- Jest transpilation stays explicit through `tsconfig.test.json`
- there is no separate `tsconfig.nodenext.json` source of truth anymore

## Why this split is the safe step
- it removes config ambiguity
- it keeps `dist/*` stable for current consumers
- it makes the NodeNext source-tree contract explicit at the root
- it keeps Jest stable without forcing the test runner onto native ESM execution
- it keeps CI’s explicit NodeNext gate without duplicating config ownership

## Required Scripts
- `npm run typecheck`
- `npm run typecheck:nodenext`
- `npm run build`

## Release Rule
- config splitting alone is compatibility work and should remain `patch` as long as the published package contract stays unchanged
