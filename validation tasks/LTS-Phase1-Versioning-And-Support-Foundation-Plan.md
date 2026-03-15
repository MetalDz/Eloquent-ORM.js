# LTS Phase 1: Versioning and Support Foundation Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Turn the LTS trust roadmap into concrete consumer-facing policy by publishing the first two foundational documents: versioning policy and support policy.

## Scope
- Publish `src/documentation/versioning-policy.md`
- publish `src/documentation/support-policy.md`
- update the master LTS plan status from `PLANNED` to `IN PROGRESS`
- lock the new policy docs with a dedicated contract test

## Implemented
- Added a versioning policy document defining:
  - SemVer rules
  - breaking/minor/patch boundaries
  - deprecation expectations
  - pre-release channels
  - release evidence requirements
- Added a support policy document defining:
  - stable vs future LTS support model
  - supported runtime/database surface expectations
  - backport policy
  - consumer support expectations
- Marked Phase 1 complete in the master LTS plan.

## Acceptance Criteria
- Consumers can read a documented SemVer policy.
- Consumers can read a documented support policy.
- The master LTS plan shows active progress instead of remaining at `PLANNED`.
