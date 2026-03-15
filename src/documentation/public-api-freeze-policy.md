# Public API Freeze Policy

Last updated: 2026-03-14

## Goal
- Define the package public API precisely and prevent accidental drift as the ORM matures toward an LTS line.

## Public API Definition
- The package public API consists of:
  - root package exports from `dist/index.js`
  - the published CLI command surface
  - documented model/runtime APIs
  - documented generator outputs produced by supported CLI commands
  - documented package templates intentionally shipped for generator/runtime use

## Internal-Only Surface
- The following are internal unless explicitly documented otherwise:
  - deep imports under `dist/core/*`
  - deep imports under `dist/cli/*`
  - repo source-path imports
  - ad hoc internal helpers not exported from the package root

## Freeze Rules
- Once a surface is declared public:
  - removals are blocked outside major releases
  - semantic repurposing is blocked outside major releases
  - behavior changes must be documented and tested
- Export additions require review so the public surface does not grow accidentally.

## Freeze Checklist
- Before release:
  - root export surface reviewed
  - CLI command/flag surface reviewed
  - generator output contracts reviewed
  - runtime behavior changes reflected in docs/tests
  - changelog and upgrade guide updated when needed

## Current Locked Surfaces
- Public API freeze should remain enforced by tests around:
  - `src/lab_test/package.surface.logic.test.ts`
  - `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`
  - `src/lab_test/orm.hardening.phase3.generated-app-test-model-stack.logic.test.ts`
  - `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`
  - `src/lab_test/orm.hardening.phase3.pack-smoke-generated-artifact-lifecycle.logic.test.ts`

## LTS Requirement
- No release line should be labeled `LTS` until the public API freeze rules are active and enforced by tests.
