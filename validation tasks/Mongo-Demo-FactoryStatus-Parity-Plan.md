# Mongo Demo + Factory Status Parity

Last updated: 2026-03-11  
Status: COMPLETE

## Goal
- Keep `demo:scenario` and `factory:status` aligned with the explicit `--mongo` targeting model already used by migration and seeding commands.

## Scope
- CLI flags
- Mongo-aware routing for `demo:scenario`
- Factory inspection parity for Mongo-backed artifacts
- Focused regression coverage

## Completed
- [x] `demo:scenario` accepts explicit driver targeting flags:
  - `--mysql`
  - `--pg`
  - `--sqlite`
  - `--mongo`
- [x] `demo:scenario` now honors an explicit resolved connection target instead of always inferring from env.
- [x] `factory:status` accepts explicit targeting flags:
  - `--mysql`
  - `--pg`
  - `--sqlite`
  - `--mongo`
  - `--all-connections`
- [x] CLI help/list surface was updated to expose the new flags.
- [x] Focused regression coverage was added for:
  - explicit Mongo demo routing
  - CLI command-surface parity for `demo:scenario` and `factory:status`

## Files
- `src/cli/commands/demoScenario.ts`
- `src/cli/eloquent.ts`
- `src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts`

## Validation
- targeted Jest run for the new NoSQL parity file
- CLI surface matrix test
- `npm run typecheck`
- `npm run build`

## Notes
- `factory:status` uses the existing startup factory filtering path, so exposing the flags on the CLI surface is enough to make `--mongo` deterministic there.
- `demo:scenario` needed a runtime change because it previously ignored explicit driver targeting and always fell back to inferred connection resolution.
