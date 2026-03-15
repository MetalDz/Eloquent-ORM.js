# LTS Phase 3: Compatibility and API Freeze Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Publish the compatibility policy and public API freeze policy that convert the current package/runtime/CLI/generator contracts into an explicit consumer promise.

## Scope
- Publish `src/documentation/backward-compatibility-policy.md`
- publish `src/documentation/public-api-freeze-policy.md`
- update the master LTS plan to mark Phase 3 complete
- add a dedicated contract test for:
  - compatibility surfaces
  - major/minor/patch compatibility rules
  - public API definition
  - public API freeze checklist
  - links to the current contract tests that already lock those surfaces

## Implemented
- Added a backward compatibility policy defining:
  - compatibility surfaces
  - what counts as breaking
  - major-only changes
  - minor/patch compatibility limits
  - internal-module boundaries
- Added a public API freeze policy defining:
  - the package public API
  - internal-only surfaces
  - freeze rules
  - release checklist
  - the current tests that lock public surfaces
- Marked Phase 3 complete in the master LTS plan.

## Acceptance Criteria
- Consumers can identify what the project considers a compatibility contract.
- Consumers can identify which surfaces are public and which deep imports are unsupported.
- The master LTS plan reflects completed compatibility/API-freeze work.
