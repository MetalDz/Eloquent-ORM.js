# Backward Compatibility Policy

Last updated: 2026-03-14

## Goal
- Define what compatibility means for this package and which consumer-facing surfaces must remain stable outside major releases.

## Compatibility Surfaces
- The following are treated as backward-compatibility surfaces:
  - documented package root exports
  - documented CLI commands and flags
  - documented model runtime APIs
  - documented generator outputs
  - documented migration and seeding lifecycle contracts

## What Counts as Breaking
- A change is breaking if it:
  - removes or renames a documented root export
  - removes or repurposes a documented CLI flag
  - changes generated file names, import paths, or default runtime stack in incompatible ways
  - changes documented model/runtime behavior incompatibly
  - changes documented migration/seed lifecycle behavior in a way that requires consumer code or ops changes

## Major-Only Changes
- The following must be released in a major version:
  - export removals
  - CLI flag removals or semantic repurposing
  - generator contract changes that alter generated file integration expectations
  - runtime API removals
  - migration or seeding contract changes that require manual upgrade work

## Minor and Patch Compatibility
- Minor releases may:
  - add new exports
  - add new commands or flags
  - add new backward-compatible generator capabilities
  - add new runtime features that do not alter documented behavior
- Patch releases must not introduce silent contract drift.

## Documented Compatibility Contracts
- Compatibility claims should be locked by tests for:
  - package surface
  - CLI surface
  - generated app/test model stack
  - scenario-generated artifacts
  - packaged runtime/smoke behavior

## Consumer Upgrade Discipline
- If a change requires consumer action, it must ship with:
  - changelog note
  - upgrade-guide note
  - explicit versioning classification

## Internal Modules
- Internal modules are not compatibility surfaces unless they are explicitly documented as public.
- Deep imports into internal paths are unsupported unless explicitly documented.
