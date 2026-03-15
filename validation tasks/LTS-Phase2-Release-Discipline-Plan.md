# LTS Phase 2: Release Discipline Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Publish the release-discipline layer needed for consumer trust: release cadence and explicit promotion criteria, with changelog and upgrade requirements locked by tests.

## Scope
- Publish `src/documentation/release-cadence.md`
- publish `src/documentation/release-promotion-checklist.md`
- update the master LTS plan to mark Phase 2 complete
- add a dedicated contract test that locks:
  - release channels and cadence rules
  - promotion checklist requirements
  - changelog and upgrade-guide expectations

## Implemented
- Added a release cadence document covering:
  - alpha, beta, rc, stable, and LTS channels
  - patch/minor/major cadence
  - stable and LTS promotion requirements
  - emergency release expectations
- Added a release promotion checklist covering:
  - stable promotion gates
  - LTS promotion gates
  - explicit blockers
- Marked Phase 2 complete in the master LTS plan.

## Acceptance Criteria
- Consumers can identify how releases move from preview to stable to LTS.
- Promotion requires changelog and upgrade documentation discipline.
- The master LTS plan reflects completed release-discipline work.
