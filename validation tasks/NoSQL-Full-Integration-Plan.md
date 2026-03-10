# NoSQL Full Integration Plan

Last updated: 2026-03-10  
Status: DONE (Phase 6 Complete)

## Goal
- Keep `mongo` as a first-class ORM runtime target with explicit CLI parity.
- Preserve SQL correctness while enabling mongo migration generation and execution paths.

## Scope
- Target driver family:
  - `mongo`
- Coverage target:
  - runtime model parity
  - CLI parity (including migrations)
  - deterministic release validation

## Current State
- Core runtime already supports mongo CRUD and relation paths.
- CLI now supports explicit mongo migration workflows.
- CI/pack-smoke gates include NoSQL regressions and migration-surface checks.

## Non-Goals
- No SQL adapter API support on mongo (`getAdapter("mongo")` stays unsupported).
- No hidden cross-driver abstraction that weakens SQL correctness.

## Target End State
- Clear mongo contract for:
  - model CRUD + hooks
  - factory/seed/scenario workflows
  - migration generation and execution commands
- Clear separation:
  - SQL adapters for SQL drivers
  - mongo-native migration context for mongo targets

## Ordered Plan

### Phase 1: Contract Definition
- [x] Define mongo feature matrix.
- [x] Freeze CLI targeting behavior (`--mongo`, `--test`, `--all-connections` semantics).

### Phase 2: Runtime Parity Baseline
- [x] Validate mongo model CRUD and primary-key behavior.
- [x] Validate relation mixin mongo branches.
- [x] Freeze transaction/session policy (no implicit multi-doc transaction orchestration).

### Phase 3: CLI Integration Parity
- [x] Validate `make:*`, `db:seed*`, `demo:scenario`, precheck/status command families.
- [x] Keep explicit mongo routing deterministic in app/test mode.

### Phase 4: Validation and Quality Gates
- [x] Add focused NoSQL parity tests.
- [x] Add `nosql-regression` CI job.
- [x] Ensure tarball smoke includes NoSQL command-surface checks.

### Phase 5: Documentation and Release Closure
- [x] Publish NoSQL usage matrix.
- [x] Publish SQL-first to NoSQL upgrade notes.
- [x] Wire release checklist to NoSQL docs + CI gate.

### Phase 6: Mongo Migration Parity
- [x] Add mongo migration tracker utility:
  - ledger bootstrap
  - checksum validation/backfill
  - stale-entry prune/relink
  - lock acquire/release
- [x] Enable mongo execution path in:
  - `migrate:status`
  - `migrate:run`
  - `migrate:rollback`
  - `migrate:fresh`
  - `migrate:reset` (through rollback path)
- [x] Enable mongo generation path in:
  - `make:migration`
- [x] Keep pack-smoke deterministic:
  - live mongo migrate execution is opt-in via `ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1`

## Phase Outputs

### Phase 1 Output: Mongo Feature Matrix

#### Supported
- `make:model --mongo` and `make:model --test --mongo`
- `make:migration --mongo`
- `migrate:status --mongo`
- `migrate:run --mongo`
- `migrate:rollback --mongo`
- `migrate:fresh --mongo`
- `migrate:reset --mongo`
- `db:seed* --mongo`
- `demo:scenario` mongo path
- `make:scenario --test --mongo` with mongo-targeted model/migration routing

#### Partial
- `make:scenario` remains test-only by contract.
- `--all-connections` remains SQL-only by default; mongo is explicit opt-in with `--mongo`.

#### Unsupported
- SQL adapter query APIs on mongo (`getAdapter("mongo")`, SQL query runner paths).

### Phase 6 Output: Mongo Migration Components
- `src/cli/utils/migrations/MongoMigrationTracker.ts`
- `src/cli/commands/makeMigration.ts` (mongo generator branch)
- `src/cli/commands/migrateRun.ts` (mongo execution branch)
- `src/cli/commands/migrateRollback.ts` (mongo rollback branch)
- `src/cli/commands/migrateStatus.ts` (mongo status branch)
- `src/cli/commands/migrateFresh.ts` (mongo drop-all branch)
- `scripts/pack-smoke.js` (mongo runtime gate switch)

## Acceptance Criteria
- NoSQL driver is a first-class documented runtime target.
- `make:migration --mongo` generates migration files.
- `migrate:status/run/rollback/fresh --mongo` execute via mongo path.
- Migration checksum/history validation works for mongo migration ledger.
- SQL adapter APIs remain blocked on mongo.
- CI includes NoSQL-focused regression coverage.

## Risks
- Mongo migration execution requires reachable mongo runtime (`MONGO_URI` / `MONGO_TEST_URI`).
- SQL/mongo parity can diverge semantically if contracts are not kept explicit.
- Over-broad abstraction could weaken SQL safety guarantees.

## Validation Strategy
- Focused logic tests for mongo migration tracker and command routing.
- NoSQL regression suite in CI.
- Pack-smoke command-surface validation with optional live mongo execution gate.

## Notes
- All phases (1 to 6) are complete and locked.
- Plan is closed.
