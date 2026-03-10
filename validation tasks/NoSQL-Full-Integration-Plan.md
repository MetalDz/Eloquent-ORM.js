# NoSQL Full Integration Plan

Last updated: 2026-03-10
Status: IN PROGRESS (Phase 3 Complete)

## Goal
- Fully integrate NoSQL support into ORM runtime and CLI workflows with predictable behavior and production-safe defaults.
- Keep SQL behavior stable while expanding parity for NoSQL use cases.

## Scope
- Target driver family:
  - `mongo`
- Coverage target:
  - runtime path parity where feasible
  - explicit documented differences where parity is not technically valid

## Current State
- Core connection and model paths already include `mongo` branches.
- Some tests validate lifecycle and selected behavior.
- Full parity is not complete yet across CLI, migrations contract, and scenario tooling.

## Non-Goals (This Task)
- No breaking API change in this task.
- No immediate migration-system redesign for document databases in this task.
- No attempt to force SQL migration semantics onto NoSQL.

## Target End State
- Clear NoSQL contract for:
  - model CRUD
  - relation behavior
  - factory and seeding workflows
  - CLI targeting and environment routing
- Stable production readiness gates for mixed SQL + NoSQL projects.
- Documented compatibility matrix: supported, partial, and intentionally unsupported features.

## Ordered Plan

### Phase 1: Contract Definition
- [x] Define ORM feature matrix for `mongo`:
  - supported
  - partial
  - unsupported
- [x] Freeze naming/targeting rules for NoSQL CLI usage:
  - `--connection`
  - `--test`
  - all-connections semantics

### Phase 1 Output: Mongo Feature Matrix (Contract Baseline)

#### Supported
- Connection lifecycle:
  - `getConnection("mongo")`
  - tracked close through `closeAllConnections()`
- Runtime model CRUD on Mongo paths:
  - `find`, `all`, `create`, `update`, `delete`, `soft_delete`, `restore`
- CLI explicit mongo targeting (`--mongo`) for connection-targeted command families.

#### Partial
- `demo:scenario` for mongo is collection-convention based (`users`, `posts`, `comments`, `post_user_pivot`).
- `db:seed*` mongo behavior depends on user model/factory implementation (SQL-first generated models are not auto-converted).
- Mixed-driver all-connections flows are backward-compatible first, not full automatic parity.

#### Unsupported (by contract)
- SQL migration engine semantics on mongo:
  - `make:migration` SQL generation
  - SQL migration tracker/history table semantics
- SQL adapter API usage on mongo (`getAdapter("mongo")` / SQL query paths).

### Phase 1 Output: CLI Targeting Rules (Frozen)
- Explicit driver targeting:
  - `--mongo` maps to `mongo` in runtime mode.
  - `--mongo --test` maps to `mongo_test` when configured.
- `--all-connections` semantics:
  - remains SQL set by default (`mysql`, `pg`, `sqlite`) for deterministic backward compatibility.
  - mongo is opt-in via explicit `--mongo`.
- SQL-only command behavior with mongo target:
  - command must skip safely with explicit warning, not crash or silently misapply SQL semantics.

### Phase 2: Runtime Parity Baseline
- [x] Validate CRUD behavior parity expectations for NoSQL models.
- [x] Validate relation mixin behavior and edge-case handling in NoSQL paths.
- [x] Define transaction/session behavior policy for NoSQL operations.

### Phase 2 Output: Runtime Parity Baseline
- Mongo primary-key resolution parity:
  - `CoreModel` Mongo paths now resolve id lookups with explicit handling for:
    - `_id` primary key mode
    - `id` primary key mode with `id/_id` fallback filter
    - custom primary key names
- Mongo connection routing parity:
  - `MongoModel` now accepts explicit mongo connection names (`mongo`, `mongo_test`) and routes `getDB()` through `this.connectionName`.
  - Invalid non-mongo connection names are rejected early with a clear error.
- Relation mixin edge-case parity:
  - `PivotHelperMixin.attach()` now safely no-ops on empty related ID lists, including Mongo paths.
- Transaction/session policy (current contract):
  - Runtime provides single-operation writes per model call on Mongo.
  - No implicit multi-document transaction/session orchestration is introduced at this phase.
  - Explicit cross-operation transactional/session orchestration remains out of scope until a dedicated design phase.

### Phase 3: CLI Integration Parity
- [x] Add NoSQL-aware coverage for command families:
  - `make:*`
  - `db:seed*`
  - `demo:scenario`
  - status/precheck flows
- [x] Ensure unsupported SQL-only commands fail clearly for NoSQL with actionable messages.

### Phase 3 Output: CLI Integration Parity
- Added focused NoSQL CLI parity regression coverage:
  - `src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- Command-family parity coverage now includes:
  - `make:*`:
    - `make:migration` explicitly skips non-SQL mongo targets with actionable guidance.
  - `db:seed*`:
    - explicit mongo connection routing is validated through `db:seed` and `db:seed:fresh`.
  - `demo:scenario`:
    - mongo path is validated to use `getConnection` document workflow (not SQL adapter).
  - status/precheck:
    - mongo `migrate:status` skip guidance and `db:seed:precheck` mongo connectivity path are covered.
- SQL-only command guidance for mongo targets is now explicit and actionable in:
  - `migrate:run`
  - `migrate:rollback`
  - `migrate:status`
  - `migrate:fresh`
  - `make:migration`

### Phase 4: Validation and Quality Gates
- [ ] Add focused NoSQL integration tests for app + test environments.
- [ ] Add release gates to ensure NoSQL regressions fail CI.
- [ ] Confirm tarball smoke path does not regress NoSQL runtime wiring.

### Phase 5: Documentation and Release Closure
- [ ] Publish NoSQL usage guide and limitation matrix.
- [ ] Add upgrade notes for projects enabling NoSQL after SQL-first setup.
- [ ] Close this plan only after CI and pack-smoke validation are green.

## Acceptance Criteria
- NoSQL driver is treated as a first-class documented runtime target.
- CLI behavior for NoSQL is deterministic and tested.
- Unsupported SQL-only operations on NoSQL produce explicit, safe errors.
- CI includes NoSQL-focused regression coverage.
- Documentation reflects actual runtime behavior and limits.

## Risks
- Feature parity assumptions can hide meaningful SQL/NoSQL semantic differences.
- Over-generalized abstractions may reduce correctness for either driver family.
- Mixed-connection projects can introduce ambiguous defaults if routing is unclear.

## Validation Strategy
- Use focused logic/integration tests first, then broader CLI scenario runs.
- Keep SQL regressions blocked while enabling NoSQL parity work.
- Track deltas in `validation tasks/Progress snapshot.md` during implementation phases.

## Notes
- Phase 1, Phase 2, and Phase 3 are complete and locked.
- Next active implementation target is Phase 4 (validation and quality gates).
