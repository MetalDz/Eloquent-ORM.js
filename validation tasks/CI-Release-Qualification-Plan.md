# CI and Release Qualification Plan

Last updated: 2026-03-06

## Goal
- Close Production Readiness Step 6:
  - enforce CI gates (`typecheck`, critical hardening, scenario matrix)
  - enforce dependency/security checks (`npm audit` + lockfile policy)
  - publish explicit release qualification checklist with pass/fail criteria

## Implementation Checklist
- [x] Added explicit dependency/security CI job:
  - `.github/workflows/ci.yml`
  - Includes:
    - lockfile existence check (`test -f package-lock.json`)
    - lockfile install policy (`npm ci --ignore-scripts`)
    - production dependency audit gate (`npm audit --omit=dev --audit-level=high`)
- [x] Added release qualification checklist:
  - `src/documentation/release-qualification-checklist.md`
- [x] Added Step 6 validation test:
  - `src/lab_test/ci.release.qualification.logic.test.ts`
- [x] Wired Step 6 artifacts into global production readiness gate:
  - `src/lab_test/production.readiness.gates.logic.test.ts`
  - `validation tasks/Production-Readiness-Assessment.md`

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/ci.release.qualification.logic.test.ts`
  - `npm.cmd test -- --runTestsByPath src/lab_test/production.readiness.gates.logic.test.ts`
- Expected:
  - `PASS`
- Result:
  - `PASS` (2/2 suites).
