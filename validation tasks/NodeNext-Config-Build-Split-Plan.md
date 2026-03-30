# NodeNext Config Build Split Plan

Status: LOCKED

## Goal
Split config responsibilities so the repo can move toward a NodeNext source tree without breaking the published package:
- shared compiler defaults live in one base config
- the published `dist/*` build remains CommonJS
- the repo has an explicit NodeNext target config for the migration path

## Locked Config Shape
- `tsconfig.base.json`
  - shared compiler defaults only
- `tsconfig.json`
  - current passing typecheck/dev compatibility config
  - remains CommonJS-oriented until the import migration is complete
- `tsconfig.build.json`
  - explicit CommonJS build output for `dist/*`
- `tsconfig.nodenext.json`
  - explicit NodeNext target contract for the source-tree migration

## Important Constraint
This split does **not** mean the whole repo already passes under NodeNext.

At this stage:
- CommonJS build stability stays protected
- NodeNext typecheck exists as the migration target
- the import rewrite and generator/template migration still come later

## Why this split is the safe step
- it removes config ambiguity
- it keeps `dist/*` stable for current consumers
- it makes the target NodeNext contract explicit before mass rewrites
- it lets the migration be audited without pretending the rewrite is already done

## Required Scripts
- `npm run typecheck`
- `npm run typecheck:nodenext`
- `npm run build`

## Release Rule
- config splitting alone is compatibility work and should remain `patch` as long as the published package contract stays unchanged
