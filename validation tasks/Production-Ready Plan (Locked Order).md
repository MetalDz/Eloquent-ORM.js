# Production-Ready Plan (Locked Order)

## Execution Rules (No Forward/Backward Drift)
1. Do not start Milestone N+1 until Milestone N done criteria is fully green.
2. If a regression appears in an earlier milestone, stop and fix it before continuing.
3. Each milestone must produce evidence:
- test output
- CI link/status
- changed files
4. No release cut from feature branches. Release only from `master`.

---

## Milestone 1: Release Blockers (Completed)
Status: `DONE`

- [x] Implement reversible migrations (`down`) for create/update/pivot.
- [x] Fix pivot factory template import paths.
- [x] Implement real `cache:clear` and `cache:stats` behavior.
- [x] Fix Mongo connection lifecycle (track and close client cleanly).
- [x] Add tests for all items above.

Done criteria:
- [x] `migrate:run + migrate:rollback` restores schema on test DB.
- [x] Cache commands work.
- [x] No hanging processes in validated paths.

---

## Milestone 2: Test Coverage and Quality Gate (Completed)
Status: `DONE`

- [x] Add tests for CoreModel CRUD (mysql/sqlite minimum).
- [x] Add tests for relations (`belongsTo`, `hasMany`, `belongsToMany`, `morphTo`, `morphMany`, `morphOne`, `hasOne`).
- [x] Add CLI integration tests for `make:migration --all --test`, `migrate:run`, `db:seed`, scenario checks.
- [x] Add CI gate: `typecheck + build + test`.
- [x] Add coverage gate in Jest + CI (`test:coverage`).

Done criteria:
- [x] Stable local reruns in current env.
- [x] CI quality gate configured.
- [x] Meaningful baseline coverage with threshold enforcement.

---

## Milestone 3: Multi-DB Hardening (Completed)
Status: `DONE`

### Step 3.1: Deterministic DB matrix foundation
- [x] Configure CI service containers for MySQL and Postgres.
- [x] Add SQLite job (file-based, isolated temp path).
- [x] Use fixed env + fixed seed/reset flow per job.
- [x] Ensure each DB job is isolated and repeatable.

### Step 3.2: Adapter parity tests
- [x] Validate placeholders, `inClause`, `wrapId` across SQL drivers through adapter-backed flows.
- [x] Add explicit regression tests for insert/return behavior per driver.
- [x] Add more regression tests for driver-specific edge cases.

### Step 3.3: Migration dialect parity
- [x] Validate generated DDL and schema diff logic per driver.
- [x] Fix dialect-specific issues in schema introspection and alter/create/drop behavior.

### Step 3.4: Scenario parity
- [x] Run same scenario flow on all supported SQL drivers locally:
- generate
- migrate
- seed
- relation checks
- [x] Validate MySQL scenario flow.
- [x] Validate Postgres scenario flow.
- [x] Validate SQLite scenario flow.
- [x] Confirm same scenario succeeds on MySQL + Postgres + SQLite in CI matrix.

Done criteria:
- [x] Same scenario succeeds on MySQL + Postgres + SQLite in CI matrix.

Evidence captured:
- Local gate green: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:coverage`
- Local SQLite blog scenario green: generate + migrate + seed + `demo:scenario --test --random`
- Postgres blog scenario green from CLI output: `demo:scenario --test --random`
- CI matrix green: MySQL + Postgres + SQLite scenario jobs passed, plus MySQL quality gate passed

---

## Milestone 4: Security and Stability Hardening (Must Before Release)
Status: `DONE`

### Step 4.1: SQL injection hardening
- [x] Add SQL injection regression tests (CRUD + relation filters).
- [x] Fuzz identifier inputs; verify safe rejection.
- [x] Remove/replace unsafe string interpolation in schema introspection SQL where possible.

### Step 4.2: Migration safety
- [x] Add migration lock to avoid concurrent runs.
- [x] Add migration checksum/history validation.
- [x] Validate rollback safety in DB matrix jobs.

### Step 4.3: Flakiness controls
- [x] Add repeated-run test job for critical suites.
- [x] Enforce command timeout/no-hang checks for CLI integration flows.

Done criteria:
- [x] No known SQLi path in supported ORM APIs.
- [x] No flaky critical tests across repeated CI runs.

---

## Milestone 5: Package and API Hardening
Status: `DONE`

### Step 5.1: Package surface
- [x] Add strict `exports` map in `package.json`.
- [x] Add `files` whitelist to publish only required artifacts (`dist`, typings, docs, license, readme).
- [x] Verify no internal modules are accidentally exported.

### Step 5.2: Tarball validation
- [x] `npm pack` in CI.
- [x] Install tarball in a clean sample app.
- [x] Validate documented import paths, migrate/seed flow, and runtime boot.

Evidence in hand:
- Local tarball smoke passed with `npm run test:pack-smoke`.
- CI tarball smoke job added: `Package Smoke (Tarball)`.
- Clean temp app validated: import package root, run CLI, generate scenario, migrate, seed, and demo via SQLite test mode.
- Local CLI integration now validates connection-targeted `migrate:run`, `db:seed`, and `db:seed:fresh` in app/test mode, including `--all-connections`.
- Local CLI integration now validates `make:migration --pivot-separate` plus direct shell coverage for `migrate:status`, `migrate:fresh`, and `migrate:reset`.
- Local app fixtures now support morph + pivot scenario coverage, and CLI integration validates app sqlite `migrate:run --pivot-separate` plus app `demo:scenario --user`.
- Local generator integration now validates direct shell behavior for `make:model`, `make:controller`, `make:service`, `make:seed`, `make:factory`, and `make:scenario --run`.

### Step 5.3: API freeze
- [x] Freeze public API surface and mark internals as private.
- [x] Add changelog notes for any breaking export changes.

### Step 5.4: Dialect-aware schema update hardening
- [x] Separate update diffs into column changes and constraint changes.
- [x] Add dialect-aware `belongsTo` FK add/drop handling for update migrations.
- [x] Make Postgres updates self-aware about constraint ordering before drop/add.
- [x] Introspect existing FK constraints so diffing is not column-only.
- [x] Add regression tests for create/update/drop/rollback of relation constraints across MySQL, Postgres, and SQLite where supported.

Current evidence:
- [x] `SchemaBuilder` now diffs FK constraints separately from columns and orders update SQL safely for Postgres/MySQL.
- [x] SQLite smart-update path stays constraint-safe by avoiding unsupported `ADD CONSTRAINT` / `DROP CONSTRAINT` emits.
- [x] Focused regression coverage is green in:
  - `src/lab_test/milestone1.schema-and-template.logic.test.ts`
  - `src/lab_test/make.migration.fk.logic.test.ts`

### Step 5.5: SQL runtime parity hardening
- [x] Validate runtime CRUD (`create/find/all/update/delete`) parity across MySQL, Postgres, and SQLite adapters.
- [x] Validate patch-style partial update behavior (`update` with partial payloads) across MySQL, Postgres, and SQLite.
- [x] Validate soft-delete runtime semantics (`delete` as soft delete, `restore`, `forceDelete`) across MySQL, Postgres, and SQLite.
- [x] Validate soft-delete query semantics (`all`, `withTrashed`, `onlyTrashed`, `find`) are consistent across MySQL, Postgres, and SQLite.

Current evidence:
- [x] Runtime CRUD coverage now includes Postgres in `src/lab_test/coremodel.crud.logic.test.ts`.
- [x] Dedicated soft-delete runtime parity coverage is green in `src/lab_test/softdeletes.runtime.logic.test.ts`.
- [x] Full suite remains green after runtime hardening: `20/20` suites, `135/135` tests.

Six-item closure proof (schema + runtime):
- [x] Full dialect-aware migration behavior for relation types (including inverse no-op semantics) is covered in `src/lab_test/schema.relation.coverage.logic.test.ts`.
- [x] Pivot/morph update-diff hardening is covered in `src/lab_test/milestone1.schema-and-template.logic.test.ts` and `src/lab_test/schema.relation.coverage.logic.test.ts`.
- [x] Soft-delete column generation audit (create + smart update add/drop) across MySQL/Postgres/SQLite is covered in `src/lab_test/milestone1.schema-and-template.logic.test.ts`.
- [x] Runtime CRUD parity across MySQL/Postgres/SQLite is covered in `src/lab_test/coremodel.crud.logic.test.ts`.
- [x] Runtime `softDelete()/restore()/forceDelete` parity across MySQL/Postgres/SQLite is covered in `src/lab_test/softdeletes.runtime.logic.test.ts`.
- [x] Patch-style partial update parity across MySQL/Postgres/SQLite is covered in `src/lab_test/coremodel.crud.logic.test.ts`.

Consolidated proof run (2026-03-05):
- [x] `jest --runInBand src/lab_test/schema.relation.coverage.logic.test.ts src/lab_test/milestone1.schema-and-template.logic.test.ts src/lab_test/coremodel.crud.logic.test.ts src/lab_test/softdeletes.runtime.logic.test.ts` -> `4/4` suites passed, `41/41` tests passed.
- [x] `npm run typecheck` passed.
- [x] `npm run build` passed.

Done criteria:
- [x] Install from tarball in clean app works exactly as documented.

Verification:
- [x] `npm run test:pack-smoke` passed (tarball install + clean-app scenario flow).
- [x] Re-verified locally on 2026-03-05.

---

## Milestone 6: Documentation and Release Readiness
Status: `CURRENT`

### Step 6.1: Docs completion
- [ ] README: supported features and known limits.
- [ ] Production config docs (DB, cache, CI, migration strategy).
- [ ] Upgrade notes + compatibility table.
- [ ] Security policy (`SECURITY.md`) and support policy.

### Step 6.2: Coverage ratchet
- [ ] Keep `coverage/` ignored locally.
- [ ] Raise branch coverage threshold gradually release-by-release.
- [ ] Add targeted tests for low-covered core files before each bump.

### Step 6.3: Release execution
- [ ] Run semantic-release dry-run on `master`.
- [ ] Tag and publish from `master`.
- [ ] Verify install/run/migrate/seed reproducibility after publish.

### Step 6.4: Dependency security cleanup
  - [ ] Resolve current high-severity Dependabot alerts before release.
  - [ ] Rebuild lockfile and verify `npm test`, `npm run build`, and `npm run test:pack-smoke` after dependency updates.
  - [ ] Keep development-only lockfile alerts triaged separately from published runtime blockers.
  
  Current tracking rule:
  - [ ] Treat `npm audit --omit=dev --audit-level=high` as the runtime release gate.
  - [ ] Track GitHub `package-lock.json` development alerts separately when they come from docs/release/test tooling.
  - [ ] Prefer upgrading owning top-level tooling packages before adding deep `overrides`.

  Current development-alert owners to revisit during dependency refresh:
  - [ ] `@mintlify/previewing`
  - [ ] `@mintlify/scraping`
  - [ ] `@mintlify/common`
  - [ ] `@mintlify/validation`
- [ ] `minimatch`: ReDoS via repeated wildcards with non-matching literal in pattern
- [ ] `minimatch`: ReDoS via multiple non-adjacent `GLOBSTAR` segments
- [ ] `minimatch`: ReDoS via nested `*()` extglobs generating catastrophic backtracking regexes

Done criteria:
- [ ] Checklist fully green.
- [ ] CI matrix green.
- [ ] Reproducible install and runtime flow post-publish.

---

## Locked Progress Board
- Milestone 1: `DONE`
- Milestone 2: `DONE`
- Milestone 3: `DONE`
- Milestone 4: `DONE`
- Milestone 5: `DONE` 
- Milestone 6: `CURRENT`
