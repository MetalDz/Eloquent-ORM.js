# CI Pipeline Improvement Plan

Status: COMPLETED

## Goal
Improve the existing GitHub Actions pipeline for a large test surface without replacing the current CI/CD structure.

## Implemented
- Added a dedicated `typecheck-nodenext` CI gate in `.github/workflows/ci.yml`.
- Layered the heavier Linux/Windows/package/scenario jobs behind:
  - `typecheck`
  - `typecheck-nodenext`
  - `build`
- Aligned the Docker coverage CI step with the package script:
  - `npm run test:coverage:docker`
- Added publish-time parity in `.github/workflows/publish.yml`:
  - `npm run typecheck:nodenext`
- Updated `src/documentation/release-qualification-checklist.md` so release criteria include the NodeNext and Docker coverage gates.

## Why This Is Better
- Fast correctness gates fail early before expensive matrix and Docker jobs consume runner time.
- NodeNext source compatibility is now a first-class CI contract.
- The publish workflow matches the package’s real compatibility surface instead of only checking CommonJS type/build paths.
- Workflow intent is clearer and easier to audit from docs and tests.

## Validation Targets
- `src/lab_test/ci.pipeline.improvement.logic.test.ts`
- `src/lab_test/ci.release.qualification.logic.test.ts`
- `src/lab_test/ci.workflow.hardening.alignment.logic.test.ts`
