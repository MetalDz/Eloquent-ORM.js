# Dependency Security Audit Tracking Plan

Last updated: 2026-04-11

## Goal
- Track and close the production dependency audit failure reported by:
  - `npm audit --omit=dev --audit-level=high`
- Keep the CI audit gate enforced after remediation.

## Original Advisory Scope
- Advisory chain 1:
  - `@tootallnate/once <3.0.1`
  - pulled through `http-proxy-agent` -> `make-fetch-happen` -> `node-gyp` -> `sqlite3`
- Advisory chain 2:
  - `minimatch <=3.1.3`
  - high severity ReDoS advisories

## Release Impact
- CI policy already requires:
  - `npm audit --omit=dev --audit-level=high`
- Until this audit passes, Step 6 is not materially closed for release readiness.
- This is a dependency supply-chain risk, not an application logic bug.

## Tracking Checklist
- [x] Captured current advisory names and transitive package chain.
- [x] Added tracking-only validation test:
  - `src/lab_test/dependency.audit.tracking.logic.test.ts`
- [x] Linked the open blocker in production readiness tracking.
- [x] Inspected `package-lock.json` and installed prod tree to identify exact owning versions.
- [x] Prepared remediation decision path without applying fixes.
- [x] Re-ran production dependency audit:
  - `npm audit --omit=dev --audit-level=high`
- [x] Added runtime regression coverage after the dependency tree changed:
  - `src/lab_test/sqlite.driver.replacement.logic.test.ts`

## Phase 1: Analysis Findings
- Production-only vulnerable path is:
  - `sqlite3@5.1.7`
  - `node-gyp@8.4.1`
  - `make-fetch-happen@9.1.0`
  - `http-proxy-agent@4.0.1`
  - `@tootallnate/once@1.1.2`
- Related production path for `minimatch` is:
  - `sqlite3@5.1.7`
  - `node-gyp@8.4.1`
  - `glob@7.2.3`
  - `minimatch@3.1.2`
- Production-only tree check result:
  - under `--omit=dev`, the advisory set is rooted in `sqlite3` only
  - dev-only packages are not the current release blocker
- Runtime coupling points:
  - `src/core/connection/DatabaseConnection.ts`
  - `scripts/pack-smoke.js`
  - `README.md` SQLite driver matrix
- Meaning:
  - this is a real runtime dependency risk for published consumers
  - it cannot be treated as a CI-only or dev-tooling false positive

## Phase 2: Ordered Remediation Plan
1. Verify whether an audit-clean `sqlite3` release exists and can replace `5.1.7` without API changes.
   - If yes: prefer a direct dependency upgrade.
2. If `sqlite3` remains audit-blocked, replace it with a maintained SQLite driver and adapt the connection layer.
   - This is the safer long-term option than pinning vulnerable transitives forever.
3. Use `overrides` only as a temporary fallback, not the primary fix.
   - `minimatch` may be override-compatible.
   - `@tootallnate/once` is a major-version jump from `1.1.2`, so override risk is materially higher.
4. After dependency choice is approved, update runtime integration points:
   - `src/core/connection/DatabaseConnection.ts`
   - SQLite test fixtures and scenario commands
   - `scripts/pack-smoke.js`
   - docs that declare the SQLite driver contract
5. Re-run release gates in this order to avoid redo:
   - targeted dependency audit check
   - SQLite-focused runtime tests
   - `npm.cmd run test:critical`
   - `npm.cmd run test:pack-smoke`
   - `npm.cmd run test:coverage`

## Recommended Path
- Preferred: direct `sqlite3` upgrade if an audit-clean release exists and preserves the current driver API.
- Fallback: replace `sqlite3` at the connection layer.
- Avoid as primary strategy: forcing deep transitive overrides for `@tootallnate/once`.

## Phase 3: Direct Upgrade Verdict
- Direct `sqlite3` upgrade path is blocked.
- Latest published `sqlite3` remains `5.1.7`, which is the vulnerable version already present in the original production tree.
- Because the direct package path could not clear the audit gate, remediation moved to driver replacement.

## Phase 4: Applied Remediation
- Replaced runtime SQLite integration with `better-sqlite3@12.2.0`.
- Added SQLite compatibility wrapper:
  - `src/core/connection/BetterSqliteConnection.ts`
- Updated runtime connection wiring:
  - `src/core/connection/DatabaseConnection.ts`
- Updated package smoke SQLite example:
  - `scripts/pack-smoke.js`
- Updated package dependency contract:
  - `package.json`
  - removed `sqlite3`
  - removed `sqlite`
  - added `better-sqlite3`

## Closure Evidence
- Production-only audit result:
  - `npm audit --omit=dev --audit-level=high`
  - result: `found 0 vulnerabilities`
- Runtime regression result:
  - `npm.cmd test -- --runTestsByPath src/lab_test/sqlite.driver.replacement.logic.test.ts`
  - result: `PASS`
- Build result:
  - `npm.cmd run build`
  - result: `PASS`
- Tarball smoke result:
  - `npm run test:pack-smoke`
  - result: `PASS`
- Critical stability suite result:
  - `npm run test:critical`
  - result: `PASS` (7/7 suites, 66/66 tests)

## Constraints
- No silent suppression of the audit gate.
- Keep CI audit enforcement active after remediation.

## 2026-04-11 Development Alert Triage
- Current GitHub alerts for `basic-ftp`, `tar`, `lodash`, `lodash-es`, `js-yaml`, `qs`, `body-parser`, `express`, `send`, `serve-static`, `cookie`, and `picomatch` are mostly rooted in the development/docs toolchain, not the shipped ORM runtime.
- The main owning packages in the current lockfile are:
  - `@mintlify/previewing`
    - old `express@4.18.2`
    - `body-parser@1.20.1`
    - `qs@6.11.0`
    - `send@0.18.0`
    - `serve-static@1.15.0`
    - `cookie@0.5.0`
    - `tar@6.1.15`
  - `@mintlify/scraping`
    - `basic-ftp@5.2.0` through `puppeteer -> proxy-agent -> pac-proxy-agent -> get-uri`
  - `@mintlify/common` and `@mintlify/validation`
    - older `lodash@4.17.21`
    - `js-yaml@4.1.0`
- The direct published runtime contract remains narrower:
  - shipped artifacts are `dist`, `esm`, CLI templates, `README.md`, `CHANGELOG.md`, and `PACKAGE-UPDATE-SUMMARY.md`
  - runtime `dependencies` do not directly include the alert packages above
- This means the current advisory set is primarily:
  - CI / maintainer workstation / docs-preview risk
  - not a confirmed consumer runtime blocker for the published ORM package

## Future Update / Upgrade Rule
- Keep the production release gate focused on:
  - `npm audit --omit=dev --audit-level=high`
- Track development-only lockfile alerts separately from production release blockers.
- When GitHub flags development alerts again:
  1. identify the owning top-level package with `npm ls ... --all`
  2. classify whether it is:
     - shipped runtime risk
     - dev-only tooling risk
  3. prefer upstream package upgrades first:
     - especially `@mintlify/cli`
     - `@mintlify/validation`
     - any related `@mintlify/*` packages
  4. use `overrides` only as a temporary fallback when the upstream package cannot yet be upgraded cleanly
  5. after any lockfile change, re-run:
     - `npm test`
     - `npm run build`
     - `npm run test:pack-smoke`
- Do not move this classification into official docs unless the advisory affects the published consumer runtime contract.

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/sqlite.driver.replacement.logic.test.ts src/lab_test/dependency.audit.tracking.logic.test.ts src/lab_test/production.readiness.gates.logic.test.ts`
- Expected:
  - `PASS`
- Validation note:
  - On this Windows environment, spawn-heavy CLI suites were validated through Git Bash because PowerShell `spawnSync node.exe/cmd.exe EPERM` interferes with CLI subprocess tests.
- Analysis command evidence:
  - `npm.cmd ls --omit=dev @tootallnate/once minimatch http-proxy-agent make-fetch-happen node-gyp sqlite3 --all`
  - Expected conclusion:
    - vulnerable production tree is rooted in `sqlite3`
